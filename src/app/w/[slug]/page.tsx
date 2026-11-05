import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { wishes } from "@/db/schema";
import { ScoreCard } from "@/components/ScoreCard";
import { StoryViewer } from "@/components/StoryViewer";
import { genieLine } from "@/lib/scoring";

export default async function SharedWish({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [wish] = await db
    .select({ text: wishes.text, scenes: wishes.scenes, score: wishes.score })
    .from(wishes)
    .where(and(eq(wishes.shareSlug, slug), eq(wishes.shareStatus, "approved")));
  if (!wish) notFound();

  const score = wish.score ?? 0;

  return (
    <>
      <p>내 소원은... {wish.text}</p>
      <StoryViewer scenes={wish.scenes ?? []} complete ending={<ScoreCard score={score} line={genieLine(score)} />} />
    </>
  );
}
