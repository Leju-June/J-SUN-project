import { and, asc, desc, eq, gte, isNotNull } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Frame } from "@/components/Frame";
import { db } from "@/db";
import { wishes } from "@/db/schema";
import { weekStartKst } from "@/lib/wish-text";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "이번 주의 소원", description: "이번 주 공유된 소원 중 가장 잘 쓴 소원과 최악의 재앙." };

const LIMIT = 10;

async function ranked(order: "best" | "worst") {
  const since = new Date(`${weekStartKst()}T00:00:00+09:00`);
  return db
    .select({ text: wishes.text, score: wishes.score, slug: wishes.shareSlug })
    .from(wishes)
    .where(and(eq(wishes.shareStatus, "approved"), gte(wishes.createdAt, since), isNotNull(wishes.score)))
    .orderBy(order === "best" ? desc(wishes.score) : asc(wishes.score))
    .limit(LIMIT);
}

function WishList({ items }: { items: Awaited<ReturnType<typeof ranked>> }) {
  if (items.length === 0) return <p className="notice">아직 공유된 소원이 없다.</p>;
  return (
    <ol className="panel-list record-list rank-list">
      {items.map((item) => (
        <li key={item.slug}>
          <Link href={`/w/${item.slug}`}>
            <span className="record-meta">{item.score}점</span>
            <span className="record-text">{item.text}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default async function Hall() {
  const [best, worst] = await Promise.all([ranked("best"), ranked("worst")]);
  return (
    <Frame title="이번 주의 소원">
      <h2 className="section-title">지니를 긴장시킨 소원</h2>
      <WishList items={best} />
      <h2 className="section-title">최악의 재앙</h2>
      <WishList items={worst} />
    </Frame>
  );
}
