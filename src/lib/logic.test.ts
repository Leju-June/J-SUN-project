import { describe, expect, it } from "vitest";
import { matchAchievements } from "./achievements";
import { drawKeywords, type Candidate } from "./draw";
import { hashWish, weekStartKst } from "./wish-text";

const candidate = (id: number, slot: string, similarity: number, severity = 50): Candidate => ({
  id,
  word: `단어${id}`,
  slot,
  baseWeight: 1,
  severity,
  similarity,
});

describe("키워드 추첨", () => {
  it("슬롯마다 하나씩 뽑는다", () => {
    const drawn = drawKeywords(
      [candidate(1, "loophole", 0.5), candidate(2, "price", 0.5), candidate(3, "material", 0.1), candidate(4, "ending", 0.2)],
      50,
    );
    expect(drawn.map((keyword) => keyword.slot)).toEqual(["loophole", "price", "material", "ending"]);
  });

  it("loophole 슬롯은 연관된 키워드가 더 자주 뽑힌다", () => {
    const pool = [candidate(1, "loophole", 0.7), candidate(2, "loophole", 0)];
    const drawn = Array.from({ length: 500 }, () => drawKeywords(pool, 50)[0].id);
    expect(drawn.filter((id) => id === 1).length).toBeGreaterThan(450);
  });

  it("불행도가 높으면 강한 키워드가 더 자주 뽑힌다", () => {
    const pool = [candidate(1, "price", 0.3, 10), candidate(2, "price", 0.3, 95)];
    const drawn = Array.from({ length: 500 }, () => drawKeywords(pool, 95)[0].id);
    expect(drawn.filter((id) => id === 2).length).toBeGreaterThan(400);
  });
});

describe("소원 정규화", () => {
  it("공백, 문장부호, 대소문자 차이를 무시한다", () => {
    expect(hashWish("내 다리가 낫게 해줘!")).toBe(hashWish("내다리가  낫게해줘"));
    expect(hashWish("Fly ME")).toBe(hashWish("fly me"));
    expect(hashWish("다리가 낫게")).not.toBe(hashWish("다리를 낫게"));
  });
});

describe("주간 초기화", () => {
  it("한국 시간 월요일 0시에 주가 바뀐다", () => {
    expect(weekStartKst(new Date("2026-11-08T14:59:00Z"))).toBe("2026-11-02");
    expect(weekStartKst(new Date("2026-11-08T15:00:00Z"))).toBe("2026-11-09");
  });
});

describe("업적", () => {
  it("조건을 만족한 업적만 반환한다", () => {
    const codes = matchAchievements({
      text: "짧은 소원",
      score: 92,
      breakdown: {
        analysis: { taboo: "none", clarity: 90, realism: 90, density: 90, narrative: 90, keywords: [] },
        severityAverage: 20,
        misfortune: 10,
        quality: 90,
        tier: "long",
      },
    }).map((achievement) => achievement.code);
    expect(codes).toEqual(["first_wish", "genie_sweat", "short_and_sharp"]);
  });
});
