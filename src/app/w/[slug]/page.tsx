import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { wishes } from "@/db/schema";
import { ScoreCard } from "@/components/ScoreCard";
import { CopyLinkButton } from "@/components/ShareActions";
import { StoryViewer } from "@/components/StoryViewer";
import { genieLine } from "@/lib/scoring";

const TITLE_LENGTH = 40;
const DESCRIPTION_LENGTH = 110;

const clip = (text: string, length: number) => (text.length > length ? `${text.slice(0, length - 1)}…` : text);

// 메타데이터와 본문이 같은 요청에서 한 번만 조회하도록 묶는다.
const findShared = cache(async (slug: string) => {
  const [wish] = await db
    .select({ text: wishes.text, scenes: wishes.scenes, score: wishes.score })
    .from(wishes)
    .where(and(eq(wishes.shareSlug, slug), eq(wishes.shareStatus, "approved")));
  return wish;
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const wish = await findShared((await params).slug);
  if (!wish) return {};
  const title = `${wish.score ?? 0}점 · ${clip(wish.text, TITLE_LENGTH)}`;
  const description = clip((wish.scenes?.[0] ?? "").replace(/\s+/g, " "), DESCRIPTION_LENGTH);
  return { title, description, openGraph: { title, description, type: "article" } };
}

export default async function SharedWish({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const wish = await findShared(slug);
  if (!wish) notFound();

  const score = wish.score ?? 0;
  const ending = (
    <div>
      <ScoreCard score={score} line={genieLine(score)} />
      <div className="actions">
        <Link className="button" href="/">
          나도 소원 빌기
        </Link>
        <CopyLinkButton slug={slug} />
      </div>
    </div>
  );

  return (
    <>
      <p className="wish-quote">내 소원은... {wish.text}</p>
      <StoryViewer scenes={wish.scenes ?? []} complete ending={ending} />
    </>
  );
}
