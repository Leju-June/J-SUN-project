"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { safeNext } from "@/lib/next-path";
import { hashPassword, verifyPassword } from "@/lib/password";
import { startSession } from "@/lib/session";

/** 실패하면 적었던 값(비밀번호 제외)을 돌려줘 폼에 다시 채운다. */
export type AuthState = { error: string | null; email?: string; displayName?: string };

const email = z.string().trim().toLowerCase().email("이메일 형식이 아닙니다.").max(254);
const password = z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(200);

const signupSchema = z.object({
  email,
  displayName: z.string().trim().min(1, "이름을 적어 주세요.").max(40, "이름은 40자까지입니다."),
  password,
});

const loginSchema = z.object({ email, password: z.string().min(1, "비밀번호를 적어 주세요.") });

const firstError = (error: z.ZodError) => error.issues[0]?.message ?? "입력을 확인해 주세요.";

const typed = (formData: FormData) => ({
  email: String(formData.get("email") ?? ""),
  displayName: String(formData.get("displayName") ?? ""),
});

export async function signupAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error), ...typed(formData) };

  const [created] = await db
    .insert(users)
    .values({ email: parsed.data.email, displayName: parsed.data.displayName, passwordHash: await hashPassword(parsed.data.password) })
    .onConflictDoNothing()
    .returning({ id: users.id });
  if (!created) return { error: "이미 가입된 이메일입니다.", ...typed(formData) };

  await startSession(created.id);
  redirect(safeNext(formData.get("next")));
}

export async function loginAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error), ...typed(formData) };

  const [user] = await db.select({ id: users.id, passwordHash: users.passwordHash }).from(users).where(eq(users.email, parsed.data.email));
  // 계정이 없어도 같은 시간을 쓰도록 검증은 항상 한 번 돌린다.
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? "scrypt$32768$AAAAAAAAAAAAAAAAAAAAAA$AA");
  if (!user || !ok) return { error: "이메일 또는 비밀번호가 맞지 않습니다.", ...typed(formData) };

  await startSession(user.id);
  redirect(safeNext(formData.get("next")));
}
