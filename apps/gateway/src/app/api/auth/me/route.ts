import { currentUser } from "@/lib/session";

/** 같은 DB를 읽기 어려운 서비스가 쓰는 조회용. 응답은 캐시하지 않는다. */
export async function GET() {
  const user = await currentUser();
  return Response.json({ user: user && { id: user.id, displayName: user.displayName } }, { headers: { "Cache-Control": "no-store" } });
}
