import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { wishes } from "@/db/schema";
import { earnedCodes, type AchievementRecord } from "./achievements";

type Row = { text: string; score: number | null; breakdown: AchievementRecord["breakdown"] | null; shareStatus: string };

/** 관리자가 숨긴 소원도 한 번 공유된 것으로 친다. */
const wasShared = (shareStatus: string) => shareStatus === "approved" || shareStatus === "hidden";

export function toRecords(rows: Row[]): AchievementRecord[] {
  return rows.flatMap(({ text, score, breakdown, shareStatus }) =>
    score === null || !breakdown ? [] : [{ text, score, breakdown, shared: wasShared(shareStatus) }],
  );
}

/** 계정이 생기기 전까지는 IP의 완료된 소원에서 달성한 업적을 계산한다. */
export async function earnedAchievements(ip: string) {
  const rows = await db
    .select({ text: wishes.text, score: wishes.score, breakdown: wishes.scoreBreakdown, shareStatus: wishes.shareStatus })
    .from(wishes)
    .where(and(eq(wishes.ip, ip), eq(wishes.status, "done")));
  return earnedCodes(toRecords(rows));
}
