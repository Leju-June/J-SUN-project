import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "jeenee_admin";

const adminToken = (secret: string) => createHmac("sha256", secret).update("jeenee-admin").digest("hex");

function matches(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function isAdmin() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const token = (await cookies()).get(COOKIE)?.value;
  return token !== undefined && matches(token, adminToken(secret));
}

export async function adminLogin(password: string) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || !matches(password, secret)) return false;
  (await cookies()).set(COOKIE, adminToken(secret), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
  return true;
}
