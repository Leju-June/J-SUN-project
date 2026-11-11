import { and, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Frame } from "@/components/Frame";
import { db } from "@/db";
import { wishes } from "@/db/schema";
import { ACHIEVEMENTS, earnedCodes } from "@/lib/achievements";
import { toRecords } from "@/lib/earned-achievements";
import { clientIp } from "@/lib/request-ip";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "내 기록", robots: { index: false } };

const dateText = (date: Date) => date.toLocaleDateString("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" });

export default async function History() {
  const ip = clientIp(await headers());
  const rows = await db
    .select({
      id: wishes.id,
      text: wishes.text,
      score: wishes.score,
      breakdown: wishes.scoreBreakdown,
      shareStatus: wishes.shareStatus,
      createdAt: wishes.createdAt,
    })
    .from(wishes)
    .where(and(eq(wishes.ip, ip), eq(wishes.status, "done")))
    .orderBy(desc(wishes.createdAt));
  const earned = earnedCodes(toRecords(rows));

  return (
    <Frame title="내 기록">
      <h2 className="section-title">
        업적 {earned.size} / {ACHIEVEMENTS.length}
      </h2>
      <ul className="panel-list achievement-list">
        {ACHIEVEMENTS.map((achievement) => (
          <li key={achievement.code} className={earned.has(achievement.code) ? "earned" : "locked"}>
            {earned.has(achievement.code) ? "[x] " : "[ ] "}
            {achievement.title}
            <span className="hint">{achievement.hint}</span>
          </li>
        ))}
      </ul>

      <h2 className="section-title">빌었던 소원</h2>
      {rows.length === 0 ? (
        <p className="notice">
          아직 빈 소원이 없다. <Link href="/">램프를 문질러봐.</Link>
        </p>
      ) : (
        <ul className="panel-list record-list">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/history/${row.id}`}>
                <span className="record-meta">
                  {row.score}점 · {dateText(row.createdAt)}
                  {row.shareStatus === "approved" && " · 공유됨"}
                </span>
                <span className="record-text">{row.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Frame>
  );
}
