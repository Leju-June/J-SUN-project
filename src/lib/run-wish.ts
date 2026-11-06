import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { keywords, wishes, wishKeywords } from "@/db/schema";
import { RefusalError, mockMode } from "./ai/client";
import { analyzeWish, generateStory } from "./ai/pipeline";
import { matchAchievements } from "./achievements";
import { drawKeywords, sampleCandidates, type RecentUses } from "./draw";
import { earnedAchievements } from "./earned-achievements";
import { releaseQuota, reserveQuota, spentTodayUsd } from "./quota";
import { SceneSplitter } from "./scenes";
import {
  computeMisfortune,
  computeQuality,
  computeScore,
  genieLine,
  misfortuneBeforeKeywords,
  storyDirection,
  storyTier,
  type ScoreBreakdown,
} from "./scoring";
import { hashWish } from "./wish-text";

export type WishEvent =
  | { type: "start"; id: string; remaining: number; mock: boolean }
  | { type: "delta"; scene: number; text: string }
  | { type: "done"; score: number; line: string; achievements: { code: string; title: string }[] }
  | { type: "duplicate"; id: string; scenes: string[]; score: number; line: string; shareSlug: string | null }
  | { type: "stopped"; reason: "busy" | "limit" | "closed" | "refused" | "error" };

const DAILY_LIMIT_USD = Number(process.env.DAILY_SPEND_LIMIT_USD ?? 20);

const RECENT_WISHES = 100;

/** 최근 소원들에 나온 키워드별 횟수. 같은 키워드만 반복되는 쏠림을 막는 데 쓴다. */
async function recentKeywordUses(): Promise<RecentUses> {
  const recent = db.select({ id: wishes.id }).from(wishes).orderBy(desc(wishes.createdAt)).limit(RECENT_WISHES);
  const rows = await db
    .select({ id: wishKeywords.keywordId, uses: sql<number>`count(*)::int` })
    .from(wishKeywords)
    .where(inArray(wishKeywords.wishId, recent))
    .groupBy(wishKeywords.keywordId);
  return new Map(rows.map(({ id, uses }) => [id, uses]));
}

/**
 * 소원 하나를 끝까지 처리한다. 클라이언트 연결이 끊겨도 멈추지 않고
 * 저장까지 마치므로, 같은 소원을 다시 빌면 결과를 받아볼 수 있다.
 */
export async function runWish(text: string, ip: string, emit: (event: WishEvent) => void) {
  const wishHash = hashWish(text);

  const [existing] = await db
    .select()
    .from(wishes)
    .where(and(eq(wishes.ip, ip), eq(wishes.wishHash, wishHash), eq(wishes.isRepeat, false), ne(wishes.status, "failed")));
  if (existing) {
    if (existing.status !== "done") return emit({ type: "stopped", reason: "busy" });
    return emit({
      type: "duplicate",
      id: existing.id,
      scenes: existing.scenes ?? [],
      score: existing.score ?? 0,
      line: genieLine(existing.score ?? 0),
      shareSlug: existing.shareStatus === "approved" ? existing.shareSlug : null,
    });
  }

  if (!mockMode() && (await spentTodayUsd()) >= DAILY_LIMIT_USD) return emit({ type: "stopped", reason: "closed" });

  const [wish] = await db
    .insert(wishes)
    .values({ text, ip, wishHash })
    .onConflictDoNothing()
    .returning({ id: wishes.id });
  if (!wish) return emit({ type: "stopped", reason: "busy" });

  const remaining = await reserveQuota(ip);
  if (remaining === null) {
    await db.delete(wishes).where(eq(wishes.id, wish.id));
    return emit({ type: "stopped", reason: "limit" });
  }

  emit({ type: "start", id: wish.id, remaining, mock: mockMode() });

  try {
    const [catalog, recentUses] = await Promise.all([db.select().from(keywords), recentKeywordUses()]);
    const shortlist = sampleCandidates(catalog, recentUses);
    const { analysis, picks, costUsd: analysisCost } = await analyzeWish(text, shortlist);
    const drawn = drawKeywords(shortlist, picks, misfortuneBeforeKeywords(analysis), recentUses);
    const severityAverage = drawn.reduce((sum, keyword) => sum + keyword.severity, 0) / Math.max(drawn.length, 1);

    const misfortune = computeMisfortune(analysis, severityAverage);
    const quality = computeQuality(analysis);
    const tier = storyTier(quality);

    const splitter = new SceneSplitter();
    const send = (deltas: ReturnType<SceneSplitter["push"]>) => {
      for (const delta of deltas) emit({ type: "delta", ...delta });
    };
    const storyCost = await generateStory(
      { wish: text, keywords: drawn.map((keyword) => keyword.word), direction: storyDirection(misfortune, analysis.taboo), tier },
      (chunk) => send(splitter.push(chunk)),
    );
    send(splitter.flush());

    const score = computeScore(misfortune, quality);
    const breakdown: ScoreBreakdown = { analysis, severityAverage, misfortune, quality, tier: tier.name };
    const earnedBefore = await earnedAchievements(ip);

    await db
      .update(wishes)
      .set({
        status: "done",
        scenes: splitter.scenes(),
        score,
        scoreBreakdown: breakdown,
        costUsd: analysisCost + storyCost,
      })
      .where(eq(wishes.id, wish.id));
    if (drawn.length > 0) {
      await db.insert(wishKeywords).values(drawn.map((keyword) => ({ wishId: wish.id, keywordId: keyword.id })));
    }

    const achievements = matchAchievements({ text, score, breakdown }).filter(({ code }) => !earnedBefore.has(code));
    emit({ type: "done", score, line: genieLine(score), achievements });
  } catch (error) {
    await db.update(wishes).set({ status: "failed" }).where(eq(wishes.id, wish.id));
    await releaseQuota(ip);
    if (!(error instanceof RefusalError)) console.error("소원 처리 실패", error);
    emit({ type: "stopped", reason: error instanceof RefusalError ? "refused" : "error" });
  }
}
