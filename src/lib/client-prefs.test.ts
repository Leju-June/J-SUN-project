import { describe, expect, it } from "vitest";
import { charsPerSecond, daysUntilResetKst, isReadingSpeed } from "./client-prefs";

describe("소원 한도 초기화까지 남은 날", () => {
  it("한국 시간 월요일에는 7일이 남는다", () => {
    expect(daysUntilResetKst(new Date("2026-11-09T00:00:00+09:00"))).toBe(7);
  });

  it("한국 시간 일요일 밤에는 1일이 남는다", () => {
    expect(daysUntilResetKst(new Date("2026-11-15T23:59:00+09:00"))).toBe(1);
  });

  it("UTC로는 아직 일요일이어도 한국 시간 월요일로 계산한다", () => {
    expect(daysUntilResetKst(new Date("2026-11-15T16:00:00Z"))).toBe(7);
  });
});

describe("글자 속도", () => {
  it("저장된 값이 올바른지 가려낸다", () => {
    expect(isReadingSpeed("fast")).toBe(true);
    expect(isReadingSpeed("warp")).toBe(false);
    expect(isReadingSpeed(null)).toBe(false);
  });

  it("빠를수록 초당 글자 수가 많다", () => {
    expect(charsPerSecond("slow")).toBeLessThan(charsPerSecond("normal"));
    expect(charsPerSecond("normal")).toBeLessThan(charsPerSecond("fast"));
  });
});
