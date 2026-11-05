import { describe, expect, it } from "vitest";
import { computeMisfortune, computeQuality, computeScore, storyTier, type Analysis } from "./scoring";

const wish = (overrides: Partial<Analysis>): Analysis => ({
  taboo: "none",
  clarity: 50,
  realism: 50,
  density: 50,
  narrative: 50,
  keywords: [],
  ...overrides,
});

describe("불행도", () => {
  it("명확성이 높으면 현실성 벌점이 줄어든다", () => {
    const vague = computeMisfortune(wish({ clarity: 0, realism: 0 }), 0);
    const precise = computeMisfortune(wish({ clarity: 100, realism: 0 }), 0);
    expect(vague).toBe(90);
    expect(precise).toBeCloseTo(12);
  });

  it("금기 소원은 불행도가 최소 80이다", () => {
    expect(computeMisfortune(wish({ clarity: 100, realism: 100, taboo: "kill" }), 0)).toBe(80);
    expect(computeMisfortune(wish({ clarity: 30, realism: 5, taboo: "resurrection" }), 50)).toBe(100);
  });
});

describe("최종 점수", () => {
  it("품질 0.7, 불행도 0.3으로 계산한다", () => {
    expect(computeScore(100, 100)).toBe(70);
    expect(computeScore(0, 0)).toBe(30);
    expect(computeScore(0, 100)).toBe(100);
  });

  it("품질은 밀도 0.6, 서사성 0.4로 계산한다", () => {
    expect(computeQuality(wish({ density: 80, narrative: 60 }))).toBe(72);
  });
});

describe("분량 단계", () => {
  it("품질 구간의 경계를 지킨다", () => {
    expect(storyTier(39).name).toBe("short");
    expect(storyTier(40).name).toBe("medium");
    expect(storyTier(69).name).toBe("medium");
    expect(storyTier(70).name).toBe("long");
  });
});
