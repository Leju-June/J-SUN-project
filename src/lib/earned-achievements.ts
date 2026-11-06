import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { wishes } from "@/db/schema";
import { matchAchievements } from "./achievements";

/** 계정이 생기기 전까지는 IP의 완료된 소원에서 달성한 업적을 계산한다. */
export async function earnedAchievements(ip: string) {
  const rows = await db
    .select({ text: wishes.text, score: wishes.score, breakdown: wishes.scoreBreakdown })
    .from(wishes)
    .where(and(eq(wishes.ip, ip), eq(wishes.status, "done")));

  const codes = new Set<string>();
  for (const { text, score, breakdown } of rows) {
    if (score === null || !breakdown) continue;
    for (const achievement of matchAchievements({ text, score, breakdown })) codes.add(achievement.code);
  }
  return codes;
}
