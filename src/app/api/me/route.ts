import { ACHIEVEMENTS } from "@/lib/achievements";
import { earnedAchievements } from "@/lib/earned-achievements";
import { remainingQuota } from "@/lib/quota";
import { clientIp } from "@/lib/request-ip";

export async function GET(request: Request) {
  const ip = clientIp(request.headers);
  const [quota, earned] = await Promise.all([remainingQuota(ip), earnedAchievements(ip)]);
  const achievements = ACHIEVEMENTS.map(({ code, title }) => ({ code, title, earned: earned.has(code) }));
  return Response.json({ quota, achievements }, { headers: { "Cache-Control": "no-store" } });
}
