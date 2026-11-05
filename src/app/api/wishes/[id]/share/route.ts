import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { wishes } from "@/db/schema";
import { reviewForShare } from "@/lib/ai/pipeline";
import { clientIp } from "@/lib/request-ip";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return Response.json({ error: "not_found" }, { status: 404 });

  const [wish] = await db
    .select()
    .from(wishes)
    .where(and(eq(wishes.id, id), eq(wishes.ip, clientIp(request.headers)), eq(wishes.status, "done")));
  if (!wish) return Response.json({ error: "not_found" }, { status: 404 });

  // 이미 검사한 결과는 AI를 다시 호출하지 않는다.
  if (wish.shareStatus !== "private") {
    return Response.json({ status: wish.shareStatus, slug: wish.shareStatus === "approved" ? wish.shareSlug : null });
  }

  const approved = await reviewForShare(wish.text, (wish.scenes ?? []).join("\n\n"));
  const slug = approved ? randomBytes(6).toString("base64url") : null;
  await db
    .update(wishes)
    .set({ shareStatus: approved ? "approved" : "rejected", shareSlug: slug })
    .where(eq(wishes.id, id));

  return Response.json({ status: approved ? "approved" : "rejected", slug });
}
