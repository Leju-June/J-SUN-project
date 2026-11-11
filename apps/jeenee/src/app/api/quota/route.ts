import { remainingQuota } from "@/lib/quota";
import { clientIp } from "@/lib/request-ip";

export async function GET(request: Request) {
  const quota = await remainingQuota(clientIp(request.headers));
  return Response.json(quota, { headers: { "Cache-Control": "no-store" } });
}
