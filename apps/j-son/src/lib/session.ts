import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { authSessions, authUsers } from "@/db/auth-schema";

/** 게이트웨이와 같은 이름의 쿠키를 읽는다. 같은 도메인 아래 있으므로 그대로 공유된다. */
export const SESSION_COOKIE = "jsun_session";

export type SessionUser = { id: number; displayName: string };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * 로그인한 사용자. 세션이 없거나 만료됐으면 null이다.
 * DB에 닿지 못해도 게임은 브라우저 저장만으로 이어져야 하므로, 그때도 null로 본다.
 */
export async function sessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const [row] = await db
      .select({ id: authUsers.id, displayName: authUsers.displayName })
      .from(authSessions)
      .innerJoin(authUsers, eq(authUsers.id, authSessions.userId))
      .where(and(eq(authSessions.tokenHash, hashToken(token)), gt(authSessions.expiresAt, new Date())));
    return row ?? null;
  } catch (error) {
    console.error("세션 조회 실패", error instanceof Error ? error.message : error);
    return null;
  }
}
