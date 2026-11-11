export const SLOTS = ["loophole", "price", "material", "ending", "genie", "twist", "voice"] as const;
export type Slot = (typeof SLOTS)[number];

// material은 뜻밖의 소재를 위한 슬롯이라 Haiku가 고르지 않고 무작위로 둔다.
export const JUDGED_SLOTS = ["loophole", "price", "ending"] as const;
export type JudgedSlot = (typeof JUDGED_SLOTS)[number];

// 이야기를 어떻게 들려줄지 정하는 연출 슬롯. 불행도와 무관해서 점수에 들어가지 않고,
// 매번 다 쓰면 이야기가 과해지므로 슬롯마다 이 확률로만 등장한다.
// toned는 지니의 악의처럼 강도가 불행도와 어울려야 하는 슬롯이다.
const STYLE_SLOTS: Partial<Record<Slot, { chance: number; toned: boolean }>> = {
  genie: { chance: 0.8, toned: true },
  twist: { chance: 0.7, toned: false },
  voice: { chance: 0.5, toned: false },
};

export const SLOT_LABELS: Record<Slot, string> = {
  loophole: "허점",
  price: "대가",
  material: "소재",
  ending: "결말",
  genie: "지니",
  twist: "반전 구조",
  voice: "서술 방식",
};

export type Keyword = {
  id: number;
  word: string;
  description: string;
  slot: string;
  baseWeight: number;
  severity: number;
  domains: string[];
  motif: string | null;
};

export type Shortlist = Record<Slot, Keyword[]>;
export type Picks = Record<JudgedSlot, number[]>;
export type RecentUses = Map<number, number>;
/** 추첨 가중치에 영향을 주는 소원 바깥의 사정. */
export type DrawContext = { recentUses: RecentUses; domains: readonly string[] };
export type DrawTarget = { severity: number; styleSlots: number };

// 키워드가 늘어도 프롬프트 크기가 일정하도록 슬롯마다 이만큼만 Haiku에게 보여준다.
const CANDIDATES_PER_SLOT = 12;
// 후보가 약한 것부터 강한 것까지 고르게 섞이도록 나누는 강도 구간의 경계.
const SEVERITY_BANDS = [40, 70];
const RECENT_PENALTY = 0.5;
const RECENT_HALF_LIFE = 30;
const OWN_USE_WEIGHT = 6;
const DOMAIN_BOOST = 3;
const MOTIF_PENALTY = 0.1;
const SEVERITY_SPREAD = 30;

/**
 * 키워드별 최근 사용량. 전체 사용자의 사용은 오래될수록 반감기에 따라 옅어지고,
 * 같은 사용자가 이미 본 키워드는 훨씬 무겁게 쳐서 한 사람이 같은 이야기를 거듭 받지 않게 한다.
 * recentWishes는 최신 소원부터 나열한 소원별 키워드 목록이다.
 */
export function decayedUses(recentWishes: number[][], ownKeywordIds: number[]): RecentUses {
  const uses: RecentUses = new Map();
  const add = (id: number, amount: number) => uses.set(id, (uses.get(id) ?? 0) + amount);
  recentWishes.forEach((keywordIds, age) => {
    for (const id of keywordIds) add(id, 0.5 ** (age / RECENT_HALF_LIFE));
  });
  for (const id of ownKeywordIds) add(id, OWN_USE_WEIGHT);
  return uses;
}

/** 기본 가중치에 최근 사용 감쇠와 소원 영역 가산을 곱한다. */
function weightOf(keyword: Keyword, { recentUses, domains }: DrawContext) {
  const fresh = keyword.baseWeight / (1 + (recentUses.get(keyword.id) ?? 0) * RECENT_PENALTY);
  return keyword.domains.some((domain) => domains.includes(domain)) ? fresh * DOMAIN_BOOST : fresh;
}

const severityBand = (keyword: Keyword) => SEVERITY_BANDS.filter((edge) => keyword.severity >= edge).length;

/**
 * 슬롯마다 가중치에 비례해 중복 없이 후보를 뽑는다. 강도 구간마다 같은 수를 먼저 채워서,
 * 소원의 불행도가 어떻게 나오든 그에 맞는 강도의 후보가 남아 있게 한다.
 */
export function sampleCandidates(keywords: Keyword[], context: DrawContext, random: () => number = Math.random) {
  const perBand = CANDIDATES_PER_SLOT / (SEVERITY_BANDS.length + 1);

  const sample = (slot: Slot) => {
    const ranked = keywords
      .filter((keyword) => keyword.slot === slot)
      .map((keyword) => ({ keyword, rank: random() ** (1 / weightOf(keyword, context)) }))
      .sort((a, b) => b.rank - a.rank)
      .map(({ keyword }) => keyword);

    const seen = [0, 0, 0];
    const reserved = ranked.filter((keyword) => seen[severityBand(keyword)]++ < perBand);
    const filler = ranked.filter((keyword) => !reserved.includes(keyword)).slice(0, CANDIDATES_PER_SLOT - reserved.length);
    return ranked.filter((keyword) => reserved.includes(keyword) || filler.includes(keyword));
  };

  return Object.fromEntries(SLOTS.map((slot) => [slot, sample(slot)])) as Shortlist;
}

function pick<T>(items: T[], weights: number[], random: () => number) {
  let remaining = random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (let i = 0; i < items.length; i++) {
    remaining -= weights[i];
    if (remaining <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** 이번 이야기에 쓸 연출 슬롯. 확률로 고른 뒤 분량이 허락하는 수만큼만 남긴다. */
function chooseStyleSlots(limit: number, random: () => number) {
  const chosen = SLOTS.filter((slot) => {
    const style = STYLE_SLOTS[slot];
    return style !== undefined && random() < style.chance;
  });
  while (chosen.length > limit) chosen.splice(Math.floor(random() * chosen.length), 1);
  return chosen;
}

/**
 * 슬롯마다 하나씩 가중 랜덤으로 뽑는다. Haiku가 고른 슬롯은 그 후보 안에서만 뽑고,
 * 앞에서 뽑힌 키워드와 모티프가 같은 키워드는 겹치지 않도록 가중치를 크게 낮춘다.
 */
export function drawKeywords(
  shortlist: Shortlist,
  picks: Picks,
  target: DrawTarget,
  context: DrawContext,
  random: () => number = Math.random,
) {
  const styleSlots = chooseStyleSlots(target.styleSlots, random);
  const drawn: Keyword[] = [];

  for (const slot of SLOTS) {
    const style = STYLE_SLOTS[slot];
    if (style && !styleSlots.includes(slot)) continue;

    const pool = shortlist[slot];
    const judged = JUDGED_SLOTS.find((judgedSlot) => judgedSlot === slot);
    const chosen = judged ? pool.filter((keyword) => picks[judged].includes(keyword.id)) : [];
    const finalists = chosen.length > 0 ? chosen : pool;
    if (finalists.length === 0) continue;

    const toned = style?.toned ?? true;
    const weights = finalists.map((keyword) => {
      const tone = toned ? Math.exp(-Math.abs(keyword.severity - target.severity) / SEVERITY_SPREAD) : 1;
      const repeated = keyword.motif !== null && drawn.some((other) => other.motif === keyword.motif);
      return weightOf(keyword, context) * tone * (repeated ? MOTIF_PENALTY : 1);
    });
    drawn.push(pick(finalists, weights, random));
  }
  return drawn;
}

export const isStyleSlot = (slot: string) => slot in STYLE_SLOTS;

/** 불행도에 들어가는 키워드 강도 평균. 연출 슬롯은 불행과 무관하므로 뺀다. */
export function severityAverage(drawn: Keyword[]) {
  const scored = drawn.filter((keyword) => !isStyleSlot(keyword.slot));
  return scored.reduce((sum, keyword) => sum + keyword.severity, 0) / Math.max(scored.length, 1);
}
