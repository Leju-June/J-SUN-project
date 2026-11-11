import { describe, expect, it } from "vitest";
import { earnedCodes, type AchievementRecord } from "./achievements";
import { DOMAINS, detectDomains } from "./domains";
import {
  decayedUses,
  drawKeywords,
  isStyleSlot,
  sampleCandidates,
  severityAverage,
  SLOTS,
  type DrawContext,
  type Keyword,
  type Shortlist,
} from "./draw";
import { storyTier } from "./scoring";
import { hashWish, weekStartKst } from "./wish-text";
import { SEED_KEYWORDS } from "../../scripts/keywords";

const keyword = (id: number, slot: string, severity = 50, extra: Partial<Keyword> = {}): Keyword => ({
  id,
  word: `단어${id}`,
  description: "",
  slot,
  baseWeight: 1,
  severity,
  domains: [],
  motif: null,
  ...extra,
});

const shortlist = (lists: Partial<Shortlist>): Shortlist => ({
  loophole: [],
  price: [],
  material: [],
  ending: [],
  genie: [],
  twist: [],
  voice: [],
  ...lists,
});
const noPicks = { loophole: [], price: [], ending: [] };
const plain: DrawContext = { recentUses: new Map(), domains: [] };
const used = (uses: [number, number][]): DrawContext => ({ recentUses: new Map(uses), domains: [] });
const target = (severity: number, styleSlots = 0) => ({ severity, styleSlots });
const times = <T>(count: number, run: () => T) => Array.from({ length: count }, run);

const fullShortlist = shortlist({
  loophole: [keyword(1, "loophole")],
  price: [keyword(2, "price")],
  material: [keyword(3, "material")],
  ending: [keyword(4, "ending")],
  genie: [keyword(5, "genie")],
  twist: [keyword(6, "twist")],
  voice: [keyword(7, "voice")],
});

describe("키워드 추첨", () => {
  it("이야기의 뼈대가 되는 슬롯은 항상 하나씩 뽑는다", () => {
    const drawn = drawKeywords(fullShortlist, noPicks, target(50), plain);
    expect(drawn.map((item) => item.slot)).toEqual(["loophole", "price", "material", "ending"]);
  });

  it("Haiku가 고른 후보 안에서만 뽑는다", () => {
    const list = shortlist({ loophole: [keyword(1, "loophole"), keyword(2, "loophole"), keyword(3, "loophole")] });
    const drawn = times(200, () => drawKeywords(list, { ...noPicks, loophole: [2] }, target(50), plain)[0].id);
    expect(new Set(drawn)).toEqual(new Set([2]));
  });

  it("없는 번호만 고르면 표본 전체에서 뽑는다", () => {
    const list = shortlist({ loophole: [keyword(1, "loophole"), keyword(2, "loophole")] });
    const drawn = times(200, () => drawKeywords(list, { ...noPicks, loophole: [99] }, target(50), plain)[0].id);
    expect(new Set(drawn)).toEqual(new Set([1, 2]));
  });

  it("최근 자주 나온 키워드는 덜 뽑힌다", () => {
    const list = shortlist({ loophole: [keyword(1, "loophole"), keyword(2, "loophole")] });
    const picks = { ...noPicks, loophole: [1, 2] };
    const drawn = times(1000, () => drawKeywords(list, picks, target(50), used([[1, 10]]))[0].id);
    expect(drawn.filter((id) => id === 2).length).toBeGreaterThan(750);
  });

  it("불행도가 높으면 강한 키워드가 더 자주 뽑힌다", () => {
    const list = shortlist({ price: [keyword(1, "price", 10), keyword(2, "price", 95)] });
    const drawn = times(500, () => drawKeywords(list, { ...noPicks, price: [1, 2] }, target(95), plain)[0].id);
    expect(drawn.filter((id) => id === 2).length).toBeGreaterThan(400);
  });

  it("소원의 영역에 맞는 키워드가 더 자주 뽑힌다", () => {
    const list = shortlist({ material: [keyword(1, "material"), keyword(2, "material", 50, { domains: ["wealth"] })] });
    const context = { ...plain, domains: detectDomains("로또 1등에 당첨되게 해줘") };
    const drawn = times(1000, () => drawKeywords(list, noPicks, target(50), context)[0].id);
    expect(drawn.filter((id) => id === 2).length).toBeGreaterThan(650);
  });

  it("앞에서 뽑힌 키워드와 같은 모티프는 피한다", () => {
    const list = shortlist({
      loophole: [keyword(1, "loophole", 50, { motif: "망각" })],
      price: [keyword(2, "price", 50, { motif: "망각" }), keyword(3, "price")],
    });
    const drawn = times(500, () => drawKeywords(list, noPicks, target(50), plain)[1].id);
    expect(drawn.filter((id) => id === 3).length).toBeGreaterThan(400);
  });
});

describe("연출 슬롯", () => {
  const styleSlots = (styleLimit: number, random?: () => number) =>
    drawKeywords(fullShortlist, noPicks, target(50, styleLimit), plain, random)
      .map((item) => item.slot)
      .filter(isStyleSlot);

  it("분량이 허락하는 수를 넘지 않는다", () => {
    expect(Math.max(...times(300, () => styleSlots(1).length))).toBe(1);
    expect(Math.max(...times(300, () => styleSlots(2).length))).toBe(2);
    expect(storyTier(10).styleSlots).toBeLessThan(storyTier(90).styleSlots);
  });

  it("매번 다 쓰지 않고 이야기마다 구성이 달라진다", () => {
    const combos = new Set(times(300, () => styleSlots(3).join("+")));
    expect(combos.size).toBeGreaterThan(4);
    expect(styleSlots(3, () => 0)).toEqual(["genie", "twist", "voice"]);
    expect(styleSlots(3, () => 0.99)).toEqual([]);
  });

  it("지니만 불행도에 맞는 강도로 뽑힌다", () => {
    const list = shortlist({
      genie: [keyword(1, "genie", 10), keyword(2, "genie", 95)],
      twist: [keyword(3, "twist", 10), keyword(4, "twist", 95)],
    });
    const drawn = times(600, () => drawKeywords(list, noPicks, target(95, 3), plain, undefined)).flat();
    const count = (id: number) => drawn.filter((item) => item.id === id).length;
    expect(count(2)).toBeGreaterThan(count(1) * 4);
    expect(count(4)).toBeLessThan(count(3) * 2);
  });

  it("불행도에 들어가는 강도 평균에서 빠진다", () => {
    expect(severityAverage([keyword(1, "loophole", 20), keyword(2, "price", 60), keyword(3, "genie", 100), keyword(4, "voice", 100)])).toBe(40);
    expect(severityAverage([])).toBe(0);
  });
});

describe("후보 표본", () => {
  const many = Array.from({ length: 500 }, (_, index) => keyword(index + 1, "loophole"));

  it("키워드가 많아도 슬롯마다 12개만 중복 없이 고른다", () => {
    const { loophole } = sampleCandidates(many, plain);
    expect(loophole).toHaveLength(12);
    expect(new Set(loophole.map((item) => item.id)).size).toBe(12);
  });

  it("최근 자주 나온 키워드는 표본에도 덜 들어간다", () => {
    const pool = [keyword(1, "loophole"), ...many.slice(1, 13)];
    const hits = times(500, () => sampleCandidates(pool, used([[1, 40]])).loophole.some((item) => item.id === 1));
    expect(hits.filter(Boolean).length).toBeLessThan(250);
  });

  it("약한 것부터 강한 것까지 강도 구간마다 고르게 담는다", () => {
    const skewed = [
      ...Array.from({ length: 200 }, (_, index) => keyword(index + 1, "price", 50)),
      ...Array.from({ length: 5 }, (_, index) => keyword(index + 301, "price", 10)),
      ...Array.from({ length: 5 }, (_, index) => keyword(index + 401, "price", 90)),
    ];
    const { price } = sampleCandidates(skewed, plain);
    expect(price).toHaveLength(12);
    expect(price.filter((item) => item.severity === 10)).toHaveLength(4);
    expect(price.filter((item) => item.severity === 90)).toHaveLength(4);
  });

  it("어느 구간이 모자라면 나머지에서 채운다", () => {
    const pool = [keyword(1, "price", 10), ...Array.from({ length: 30 }, (_, index) => keyword(index + 2, "price", 50))];
    expect(sampleCandidates(pool, plain).price).toHaveLength(12);
  });

  it("소원의 영역에 맞는 키워드가 표본에 더 자주 들어간다", () => {
    const pool = [keyword(1, "loophole", 50, { domains: ["love"] }), ...many.slice(1, 60)];
    const hits = (domains: string[]) =>
      times(400, () => sampleCandidates(pool, { ...plain, domains }).loophole.some((item) => item.id === 1)).filter(Boolean).length;
    expect(hits(["love"])).toBeGreaterThan(hits([]) * 1.5);
  });
});

describe("최근 사용 감쇠", () => {
  it("오래된 사용일수록 옅게 센다", () => {
    const wishes = Array.from({ length: 61 }, (_, age) => (age === 0 ? [1] : age === 30 ? [2] : age === 60 ? [3] : []));
    const uses = decayedUses(wishes, []);
    expect(uses.get(1)).toBe(1);
    expect(uses.get(2)).toBeCloseTo(0.5);
    expect(uses.get(3)).toBeCloseTo(0.25);
  });

  it("같은 사용자가 본 키워드는 훨씬 무겁게 센다", () => {
    const uses = decayedUses([[1], [2]], [2]);
    expect(uses.get(2)! - uses.get(1)!).toBeGreaterThan(5);
  });
});

describe("소원 영역", () => {
  it("낱말로 영역을 알아본다", () => {
    expect(detectDomains("로또에 당첨되어 회사를 그만두게 해줘")).toEqual(["wealth", "work"]);
    expect(detectDomains("영원히 젊고 건강하게 살게 해줘")).toEqual(["body", "life"]);
    expect(detectDomains("하늘을 날게 해줘")).toEqual([]);
  });
});

describe("키워드 원본", () => {
  const all = SLOTS.flatMap((slot) => SEED_KEYWORDS[slot].map(([word, description, severity, options = {}]) => ({ slot, word, description, severity, options })));

  it("단어가 겹치지 않고 값이 범위 안에 있다", () => {
    expect(new Set(all.map((item) => item.word)).size).toBe(all.length);
    for (const { word, description, severity, options } of all) {
      expect(description.length, word).toBeGreaterThan(0);
      expect(severity, word).toBeGreaterThanOrEqual(0);
      expect(severity, word).toBeLessThanOrEqual(100);
      expect([0.6, 1, 1.3], word).toContain(options.w ?? 1);
      for (const domain of options.d ?? []) expect(DOMAINS, word).toContain(domain);
    }
  });

  it("슬롯마다 충분한 수가 있다", () => {
    const count = (slot: string) => all.filter((item) => item.slot === slot).length;
    for (const slot of ["loophole", "price"]) expect(count(slot), slot).toBeGreaterThanOrEqual(60);
    expect(count("material")).toBeGreaterThanOrEqual(100);
    expect(count("ending")).toBeGreaterThanOrEqual(40);
    for (const slot of ["genie", "twist", "voice"]) expect(count(slot), slot).toBeGreaterThanOrEqual(24);
  });

  it("점수에 들어가는 슬롯은 강도 구간마다 후보를 채울 만큼 있다", () => {
    for (const slot of ["loophole", "price", "material", "ending"]) {
      const severities = all.filter((item) => item.slot === slot).map((item) => item.severity);
      expect(severities.filter((severity) => severity < 40).length, `${slot} 약함`).toBeGreaterThanOrEqual(8);
      expect(severities.filter((severity) => severity >= 40 && severity < 70).length, `${slot} 중간`).toBeGreaterThanOrEqual(8);
      expect(severities.filter((severity) => severity >= 70).length, `${slot} 강함`).toBeGreaterThanOrEqual(8);
    }
  });

  it("연출 슬롯 가운데 반전과 서술은 강도를 쓰지 않는다", () => {
    for (const item of all.filter(({ slot }) => slot === "twist" || slot === "voice")) expect(item.severity, item.word).toBe(50);
  });

  it("모티프는 둘 이상의 키워드가 함께 쓴다", () => {
    const motifs = all.flatMap((item) => (item.options.m ? [item.options.m] : []));
    for (const motif of new Set(motifs)) expect(motifs.filter((item) => item === motif).length, motif).toBeGreaterThan(1);
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
