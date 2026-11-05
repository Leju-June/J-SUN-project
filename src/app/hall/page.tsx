import { and, asc, desc, eq, gte, isNotNull } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { wishes } from "@/db/schema";
import { weekStartKst } from "@/lib/wish-text";

export const dynamic = "force-dynamic";

const LIMIT = 5;

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
  return items.map((item) => (
    <div className="card" key={item.slug}>
      <Link href={`/w/${item.slug}`}>
        {item.score}점 · {item.text}
      </Link>
    </div>
  ));
}

export default async function Hall() {
  const [best, worst] = await Promise.all([ranked("best"), ranked("worst")]);
  return (
    <>
      <h1>이번 주의 소원</h1>
      <h2>지니를 긴장시킨 소원</h2>
      <WishList items={best} />
      <h2>최악의 재앙</h2>
      <WishList items={worst} />
    </>
  );
}
