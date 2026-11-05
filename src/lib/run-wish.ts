import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { keywords, wishes, wishKeywords } from "@/db/schema";
import { RefusalError, mockMode } from "./ai/client";
import { analyzeWish, generateStory } from "./ai/pipeline";
import { matchAchievements } from "./achievements";
import { drawKeywords, type Candidate } from "./draw";
import { embed } from "./embedding";
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

async function loadCandidates(wish: string): Promise<Candidate[]> {
  const vector = `[${(await embed(wish)).join(",")}]`;
  return db
    .select({
      id: keywords.id,
      word: keywords.word,
      slot: keywords.slot,
      baseWeight: keywords.baseWeight,
      severity: keywords.severity,
      similarity: sql<number>`1 - (${keywords.embedding} <=> ${vector}::vector)`,
    })
    .from(keywords);
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
    const { analysis, costUsd: analysisCost } = await analyzeWish(text);
    const drawn = drawKeywords(await loadCandidates(text), misfortuneBeforeKeywords(analysis));
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
      await db.insert(wishKeywords).values(drawn.map((keyword) => ({ wishId: wish.id, keywordId: keyword.id, similarity: keyword.similarity })));
    }

    emit({ type: "done", score, line: genieLine(score), achievements: matchAchievements({ text, score, breakdown }) });
  } catch (error) {
    await db.update(wishes).set({ status: "failed" }).where(eq(wishes.id, wish.id));
    await releaseQuota(ip);
    if (!(error instanceof RefusalError)) console.error("소원 처리 실패", error);
    emit({ type: "stopped", reason: error instanceof RefusalError ? "refused" : "error" });
  }
}
