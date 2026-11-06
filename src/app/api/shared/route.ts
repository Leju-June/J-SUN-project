import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { wishes } from "@/db/schema";

export const dynamic = "force-dynamic";

const LIMIT = 30;

export async function GET() {
  const items = await db
    .select({ slug: wishes.shareSlug, text: wishes.text, score: wishes.score })
    .from(wishes)
    .where(and(eq(wishes.shareStatus, "approved"), isNotNull(wishes.score)))
    .orderBy(desc(wishes.createdAt))
    .limit(LIMIT);
  return Response.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
