const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 한국 시간 기준으로 다음 월요일 0시까지 남은 날 수(1~7). 오늘이 일요일이면 1이다. */
export function daysUntilResetKst(now = new Date()) {
  const daysSinceMonday = (new Date(now.getTime() + KST_OFFSET_MS).getUTCDay() + 6) % 7;
  return 7 - daysSinceMonday;
}

export const READING_SPEEDS = [
  { id: "slow", name: "느리게", charsPerSecond: 20 },
  { id: "normal", name: "보통", charsPerSecond: 40 },
  { id: "fast", name: "빠르게", charsPerSecond: 100 },
] as const;

export type ReadingSpeedId = (typeof READING_SPEEDS)[number]["id"];

export const DEFAULT_READING_SPEED: ReadingSpeedId = "normal";

export const isReadingSpeed = (value: unknown): value is ReadingSpeedId => READING_SPEEDS.some((speed) => speed.id === value);

export const charsPerSecond = (id: ReadingSpeedId) => READING_SPEEDS.find((speed) => speed.id === id)!.charsPerSecond;

/** 저장소를 쓸 수 없는 브라우저에서는 이번 화면에서만 동작하도록 조용히 넘어간다. */
export function readStored(storage: "local" | "session", key: string) {
  try {
    return (storage === "local" ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(storage: "local" | "session", key: string, value: string | null) {
  try {
    const target = storage === "local" ? localStorage : sessionStorage;
    if (value === null) target.removeItem(key);
    else target.setItem(key, value);
  } catch {
    // 저장하지 못해도 화면은 그대로 쓴다.
  }
}
