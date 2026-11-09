import { describe, expect, it } from "vitest";
import { earnedCodes, type AchievementRecord } from "./achievements";
import { drawKeywords, sampleCandidates, type Keyword, type RecentUses, type Shortlist } from "./draw";
import { hashWish, weekStartKst } from "./wish-text";

const keyword = (id: number, slot: string, severity = 50, baseWeight = 1): Keyword => ({
  id,
  word: `단어${id}`,
  description: "",
  slot,
  baseWeight,
  severity,
});

const shortlist = (lists: Partial<Shortlist>): Shortlist => ({ loophole: [], price: [], material: [], ending: [], ...lists });
const noPicks = { loophole: [], price: [], ending: [] };
const noUses: RecentUses = new Map();

describe("키워드 추첨", () => {
  it("슬롯마다 하나씩 뽑는다", () => {
    const drawn = drawKeywords(
      shortlist({ loophole: [keyword(1, "loophole")], price: [keyword(2, "price")], material: [keyword(3, "material")], ending: [keyword(4, "ending")] }),
      noPicks,
      50,
      noUses,
    );
    expect(drawn.map((item) => item.slot)).toEqual(["loophole", "price", "material", "ending"]);
  });

  it("Haiku가 고른 후보 안에서만 뽑는다", () => {
    const list = shortlist({ loophole: [keyword(1, "loophole"), keyword(2, "loophole"), keyword(3, "loophole")] });
    const drawn = Array.from({ length: 200 }, () => drawKeywords(list, { ...noPicks, loophole: [2] }, 50, noUses)[0].id);
    expect(new Set(drawn)).toEqual(new Set([2]));
  });

  it("없는 번호만 고르면 표본 전체에서 뽑는다", () => {
    const list = shortlist({ loophole: [keyword(1, "loophole"), keyword(2, "loophole")] });
    const drawn = Array.from({ length: 200 }, () => drawKeywords(list, { ...noPicks, loophole: [99] }, 50, noUses)[0].id);
    expect(new Set(drawn)).toEqual(new Set([1, 2]));
  });

  it("최근 자주 나온 키워드는 덜 뽑힌다", () => {
    const list = shortlist({ loophole: [keyword(1, "loophole"), keyword(2, "loophole")] });
    const picks = { ...noPicks, loophole: [1, 2] };
    const drawn = Array.from({ length: 1000 }, () => drawKeywords(list, picks, 50, new Map([[1, 10]]))[0].id);
    expect(drawn.filter((id) => id === 2).length).toBeGreaterThan(750);
  });

  it("불행도가 높으면 강한 키워드가 더 자주 뽑힌다", () => {
    const list = shortlist({ price: [keyword(1, "price", 10), keyword(2, "price", 95)] });
    const drawn = Array.from({ length: 500 }, () => drawKeywords(list, { ...noPicks, price: [1, 2] }, 95, noUses)[0].id);
    expect(drawn.filter((id) => id === 2).length).toBeGreaterThan(400);
  });
});

describe("후보 표본", () => {
  const many = Array.from({ length: 500 }, (_, index) => keyword(index + 1, "loophole"));

  it("키워드가 많아도 슬롯마다 12개만 중복 없이 고른다", () => {
    const { loophole } = sampleCandidates(many, noUses);
    expect(loophole).toHaveLength(12);
    expect(new Set(loophole.map((item) => item.id)).size).toBe(12);
  });

  it("최근 자주 나온 키워드는 표본에도 덜 들어간다", () => {
    const pool = [keyword(1, "loophole"), ...many.slice(1, 13)];
    const hits = Array.from({ length: 500 }, () => sampleCandidates(pool, new Map([[1, 40]])).loophole.some((item) => item.id === 1));
    expect(hits.filter(Boolean).length).toBeLessThan(250);
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

const record = (overrides: Partial<AchievementRecord> = {}, taboo: AchievementRecord["breakdown"]["analysis"]["taboo"] = "none"): AchievementRecord => ({
  text: "짧은 소원",
  score: 60,
  shared: false,
  breakdown: {
    analysis: { taboo, clarity: 60, realism: 60, density: 60, narrative: 60 },
    severityAverage: 20,
    misfortune: 40,
    quality: 60,
    tier: "medium",
  },
  ...overrides,
});

describe("업적", () => {
  it("소원 하나로 만족한 업적을 모은다", () => {
    const high = record({ score: 92, breakdown: { ...record().breakdown, quality: 90, tier: "long" } });
    expect([...earnedCodes([high])]).toEqual(["first_wish", "genie_sweat", "short_and_sharp", "epic"]);
  });

  it("기록이 없으면 아무 업적도 없다", () => {
    expect(earnedCodes([]).size).toBe(0);
  });

  it("쌓인 기록으로 단골, 공유, 세 금기 업적을 판단한다", () => {
    const tenWishes = Array.from({ length: 10 }, () => record());
    expect(earnedCodes(tenWishes).has("regular")).toBe(true);
    expect(earnedCodes(tenWishes.slice(1)).has("regular")).toBe(false);
    expect(earnedCodes([record({ shared: true })]).has("storyteller")).toBe(true);

    const twoTaboos = [record({}, "kill"), record({}, "forced_love")];
    expect(earnedCodes(twoTaboos).has("all_taboos")).toBe(false);
    expect(earnedCodes([...twoTaboos, record({}, "resurrection")]).has("all_taboos")).toBe(true);
  });
});
