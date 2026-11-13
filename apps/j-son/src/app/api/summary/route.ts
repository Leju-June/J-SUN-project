import { listCaseIds } from "@/engine/loader";
import { sessionUser } from "@/lib/session";
import { completedCases } from "@/lib/store";

/** 로비 카드에 "사건 n/m 해결"을 보여 주려고 게이트웨이가 부른다. */
export async function GET() {
  const cases = listCaseIds();
  const user = await sessionUser();
  const done = user ? (await completedCases(user.id)).filter((caseId) => cases.includes(caseId)) : [];
  return Response.json({ loggedIn: !!user, total: cases.length, solved: done.length }, { headers: { "Cache-Control": "no-store" } });
}
