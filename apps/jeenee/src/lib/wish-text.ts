import { createHash } from "node:crypto";

export const MIN_WISH_LENGTH = 2;
export const MAX_WISH_LENGTH = 200;

export function hashWish(text: string) {
  const normalized = text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
  return createHash("sha256").update(normalized).digest("hex");
}

/** 한국 시간 기준으로 이번 주 월요일 날짜를 YYYY-MM-DD로 반환한다. */
export function weekStartKst(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const daysSinceMonday = (kst.getUTCDay() + 6) % 7;
  kst.setUTCDate(kst.getUTCDate() - daysSinceMonday);
  return kst.toISOString().slice(0, 10);
}
