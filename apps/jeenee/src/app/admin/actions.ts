"use server";

import { isIP } from "node:net";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { ipQuotas, wishes } from "@/db/schema";
import { adminLogin, isAdmin } from "@/lib/admin-auth";
import { weekStartKst } from "@/lib/wish-text";

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("관리자 권한이 필요합니다.");
}

export async function loginAction(formData: FormData) {
  await adminLogin(String(formData.get("password") ?? ""));
  revalidatePath("/admin");
}

export async function saveQuotaAction(formData: FormData) {
  await requireAdmin();
  const ip = String(formData.get("ip") ?? "").trim();
  const allowance = Number(formData.get("allowance"));
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!isIP(ip) || !Number.isInteger(allowance) || allowance < 0) return;

  await db
    .insert(ipQuotas)
    .values({ ip, allowance, note, weekStart: weekStartKst() })
    .onConflictDoUpdate({ target: ipQuotas.ip, set: { allowance, note, updatedAt: new Date() } });
  revalidatePath("/admin");
}

export async function resetUsageAction(formData: FormData) {
  await requireAdmin();
  await db
    .update(ipQuotas)
    .set({ used: 0, updatedAt: new Date() })
    .where(eq(ipQuotas.ip, String(formData.get("ip"))));
  revalidatePath("/admin");
}

export async function hideWishAction(formData: FormData) {
  await requireAdmin();
  await db
    .update(wishes)
    .set({ shareStatus: "hidden" })
    .where(eq(wishes.id, String(formData.get("id"))));
  revalidatePath("/admin");
}
