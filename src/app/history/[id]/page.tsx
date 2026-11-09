import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScoreCard } from "@/components/ScoreCard";
import { ShareActions } from "@/components/ShareActions";
import { StoryViewer } from "@/components/StoryViewer";
import { db } from "@/db";
import { wishes } from "@/db/schema";
import { clientIp } from "@/lib/request-ip";
import { genieLine } from "@/lib/scoring";

export const metadata: Metadata = { title: "내 소원", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 내가 빈 소원만 다시 볼 수 있다. 공유하지 않은 소원도 여기서 공유할 수 있다. */
export default async function MyWish({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const ip = clientIp(await headers());
  const [wish] = await db
    .select({ text: wishes.text, scenes: wishes.scenes, score: wishes.score, shareStatus: wishes.shareStatus, shareSlug: wishes.shareSlug })
    .from(wishes)
    .where(and(eq(wishes.id, id), eq(wishes.ip, ip), eq(wishes.status, "done")));
  if (!wish) notFound();

  const score = wish.score ?? 0;
  const ending = (
    <div>
      <ScoreCard score={score} line={genieLine(score)} />
      <div className="actions">
        <Link className="button" href="/history">
          기록으로
        </Link>
        {wish.shareStatus !== "hidden" && (
          <ShareActions wishId={id} slug={wish.shareStatus === "approved" ? wish.shareSlug : null} rejected={wish.shareStatus === "rejected"} />
        )}
      </div>
    </div>
  );

  return (
    <>
      <p className="wish-quote">내 소원은... {wish.text}</p>
      <StoryViewer scenes={wish.scenes ?? []} complete instant ending={ending} />
    </>
  );
}
