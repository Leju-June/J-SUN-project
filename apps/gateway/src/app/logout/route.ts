import { safeNext } from "@/lib/next-path";
import { endSession } from "@/lib/session";

/**
 * 다른 서비스에서도 폼 하나로 로그아웃할 수 있도록 일반 POST로 받는다.
 * 프록시 뒤에서는 request.url이 내부 주소라서 Location은 상대 경로로 보낸다.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  await endSession();
  return new Response(null, { status: 303, headers: { Location: safeNext(form?.get("next")) } });
}
