import { ACHIEVEMENTS } from "@/lib/achievements";
import { earnedAchievements } from "@/lib/earned-achievements";
import { remainingQuota } from "@/lib/quota";
import { clientIp } from "@/lib/request-ip";
import { sessionUser } from "@/lib/session";

export async function GET(request: Request) {
  const ip = clientIp(request.headers);
  const [quota, earned, user] = await Promise.all([remainingQuota(ip), earnedAchievements(ip), sessionUser()]);
  const achievements = ACHIEVEMENTS.map(({ code, title, hint }) => ({ code, title, hint, earned: earned.has(code) }));
  return Response.json({ user, quota, achievements }, { headers: { "Cache-Control": "no-store" } });
}
