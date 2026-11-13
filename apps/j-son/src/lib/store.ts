import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { completions, progress, submissions } from "@/db/schema";
import type { GameState } from "@/engine/state";

/**
 * 계정 저장. 로그인한 사용자에게만 쓴다.
 * 저장에 실패해도 게임은 브라우저 저장으로 이어지므로, 오류는 기록만 하고 삼킨다.
 */
const quiet = async <T>(what: string, run: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    console.error(`${what} 실패`, error instanceof Error ? error.message : error);
    return fallback;
  }
};

export const loadProgress = (userId: number, caseId: string) =>
  quiet(
    "진행 불러오기",
    async () => {
      const [row] = await db.select({ state: progress.state }).from(progress).where(and(eq(progress.userId, userId), eq(progress.caseId, caseId)));
      return (row?.state ?? null) as unknown;
    },
    null,
  );

/** 저장됐으면 true. 화면의 "계정에 저장됨" 표시에 쓴다. */
export const saveProgress = (userId: number, caseId: string, state: GameState) =>
  quiet(
    "진행 저장",
    async () => {
      await db
        .insert(progress)
        .values({ userId, caseId, state })
        .onConflictDoUpdate({ target: [progress.userId, progress.caseId], set: { state, updatedAt: sql`now()` } });
      return true;
    },
    false,
  );

export const deleteProgress = (userId: number, caseId: string) =>
  quiet(
    "진행 지우기",
    async () => {
      await db.delete(progress).where(and(eq(progress.userId, userId), eq(progress.caseId, caseId)));
      return true;
    },
    false,
  );

export const recordSubmission = (userId: number, caseId: string, boardId: string, answers: Record<string, string>, correctCount: number, total: number) =>
  quiet("제출 기록", async () => void (await db.insert(submissions).values({ userId, caseId, boardId, answers, correctCount, total })), undefined);

export const recordCompletion = (userId: number, caseId: string, playSeconds: number) =>
  quiet("완료 기록", async () => void (await db.insert(completions).values({ userId, caseId, playSeconds }).onConflictDoNothing()), undefined);

/** 이 사용자가 끝낸 사건 id. */
export const completedCases = (userId: number) =>
  quiet(
    "완료 조회",
    async () => (await db.select({ caseId: completions.caseId }).from(completions).where(eq(completions.userId, userId))).map((row) => row.caseId),
    [] as string[],
  );
