import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { keywords, wishes, wishKeywords } from "@/db/schema";
import { RefusalError, mockMode } from "./ai/client";
import { analyzeWish, generateStory } from "./ai/pipeline";
import { ACHIEVEMENTS } from "./achievements";
import { detectDomains } from "./domains";
import { decayedUses, drawKeywords, sampleCandidates, severityAverage as averageSeverity, type RecentUses } from "./draw";
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
const OWN_RECENT_WISHES = 10;

/** 최근 소원들에 나온 키워드별 사용량. 같은 키워드만 반복되는 쏠림을 막는 데 쓴다. */
async function recentKeywordUses(ip: string): Promise<RecentUses> {
  const recent = db.select({ id: wishes.id }).from(wishes).orderBy(desc(wishes.createdAt)).limit(RECENT_WISHES);
  const own = db.select({ id: wishes.id }).from(wishes).where(eq(wishes.ip, ip)).orderBy(desc(wishes.createdAt)).limit(OWN_RECENT_WISHES);
  const [rows, ownRows] = await Promise.all([
    db
      .select({ wishId: wishKeywords.wishId, keywordId: wishKeywords.keywordId })
      .from(wishKeywords)
      .innerJoin(wishes, eq(wishes.id, wishKeywords.wishId))
      .where(inArray(wishKeywords.wishId, recent))
      .orderBy(desc(wishes.createdAt)),
    db.select({ keywordId: wishKeywords.keywordId }).from(wishKeywords).where(inArray(wishKeywords.wishId, own)),
  ]);

  // Map은 넣은 순서를 지키므로 최신 소원부터 묶인다.
  const byWish = new Map<string, number[]>();
  for (const { wishId, keywordId } of rows) byWish.set(wishId, [...(byWish.get(wishId) ?? []), keywordId]);
  return decayedUses(
    [...byWish.values()],
    ownRows.map(({ keywordId }) => keywordId),
  );
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
    const [catalog, recentUses] = await Promise.all([db.select().from(keywords), recentKeywordUses(ip)]);
    const context = { recentUses, domains: detectDomains(text) };
    const shortlist = sampleCandidates(catalog, context);
    const { analysis, picks, costUsd: analysisCost } = await analyzeWish(text, shortlist);
    const quality = computeQuality(analysis);
    const tier = storyTier(quality);
    const drawn = drawKeywords(shortlist, picks, { severity: misfortuneBeforeKeywords(analysis), styleSlots: tier.styleSlots }, context);
    const severityAverage = averageSeverity(drawn);

    const misfortune = computeMisfortune(analysis, severityAverage);

    const splitter = new SceneSplitter();
    const send = (deltas: ReturnType<SceneSplitter["push"]>) => {
      for (const delta of deltas) emit({ type: "delta", ...delta });
    };
    const storyCost = await generateStory(
      { wish: text, keywords: drawn, direction: storyDirection(misfortune, analysis.taboo), tier },
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

    const earnedAfter = await earnedAchievements(ip);
    const achievements = ACHIEVEMENTS.filter(({ code }) => earnedAfter.has(code) && !earnedBefore.has(code)).map(({ code, title }) => ({
      code,
      title,
    }));
    emit({ type: "done", score, line: genieLine(score), achievements });
  } catch (error) {
    await db.update(wishes).set({ status: "failed" }).where(eq(wishes.id, wish.id));
    await releaseQuota(ip);
    if (!(error instanceof RefusalError)) console.error("소원 처리 실패", error);
    emit({ type: "stopped", reason: error instanceof RefusalError ? "refused" : "error" });
  }
}
