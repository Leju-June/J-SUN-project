import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { ipQuotas, wishes } from "@/db/schema";
import { weekStartKst } from "./wish-text";

export const WEEKLY_FREE_WISHES = 3;

/** 이번 주 사용량을 1 올린다. 한도를 넘으면 null을 반환한다. */
export async function reserveQuota(ip: string) {
  const week = weekStartKst();
  await db.insert(ipQuotas).values({ ip, weekStart: week }).onConflictDoNothing();

  const [row] = await db
    .update(ipQuotas)
    .set({
      used: sql`CASE WHEN ${ipQuotas.weekStart} < ${week} THEN 1 ELSE ${ipQuotas.used} + 1 END`,
      weekStart: week,
      updatedAt: new Date(),
    })
    .where(and(eq(ipQuotas.ip, ip), sql`(${ipQuotas.weekStart} < ${week} OR ${ipQuotas.used} < ${ipQuotas.allowance})`))
    .returning({ used: ipQuotas.used, allowance: ipQuotas.allowance });

  return row ? Math.max(row.allowance - row.used, 0) : null;
}

export async function releaseQuota(ip: string) {
  await db
    .update(ipQuotas)
    .set({ used: sql`GREATEST(${ipQuotas.used} - 1, 0)`, updatedAt: new Date() })
    .where(eq(ipQuotas.ip, ip));
}

export async function remainingQuota(ip: string) {
  const [row] = await db.select().from(ipQuotas).where(eq(ipQuotas.ip, ip));
  if (!row) return { remaining: WEEKLY_FREE_WISHES, allowance: WEEKLY_FREE_WISHES };
  const used = row.weekStart < weekStartKst() ? 0 : row.used;
  return { remaining: Math.max(row.allowance - used, 0), allowance: row.allowance };
}

export async function spentTodayUsd() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${wishes.costUsd}), 0)::float8` })
    .from(wishes)
    .where(gte(wishes.createdAt, since));
  return row.total;
}
