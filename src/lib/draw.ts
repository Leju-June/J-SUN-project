export const SLOTS = ["loophole", "price", "material", "ending"] as const;
export type Slot = (typeof SLOTS)[number];

// material은 뜻밖의 소재를 위한 슬롯이라 Haiku가 고르지 않고 무작위로 둔다.
export const JUDGED_SLOTS = ["loophole", "price", "ending"] as const;
export type JudgedSlot = (typeof JUDGED_SLOTS)[number];

export type Keyword = {
  id: number;
  word: string;
  description: string;
  slot: string;
  baseWeight: number;
  severity: number;
};

export type Shortlist = Record<Slot, Keyword[]>;
export type Picks = Record<JudgedSlot, number[]>;
export type RecentUses = Map<number, number>;

// 키워드가 늘어도 프롬프트 크기가 일정하도록 슬롯마다 이만큼만 Haiku에게 보여준다.
const CANDIDATES_PER_SLOT = 12;
const RECENT_PENALTY = 0.5;
const SEVERITY_SPREAD = 30;

/** 기본 가중치에 최근 사용 감쇠를 곱한다. 자주 나온 키워드일수록 덜 뽑힌다. */
function freshWeight(keyword: Keyword, recentUses: RecentUses) {
  return keyword.baseWeight / (1 + (recentUses.get(keyword.id) ?? 0) * RECENT_PENALTY);
}

/** 슬롯마다 가중치에 비례해 중복 없이 후보를 뽑는다. */
export function sampleCandidates(keywords: Keyword[], recentUses: RecentUses, random: () => number = Math.random) {
  const sample = (slot: Slot) =>
    keywords
      .filter((keyword) => keyword.slot === slot)
      .map((keyword) => ({ keyword, rank: random() ** (1 / freshWeight(keyword, recentUses)) }))
      .sort((a, b) => b.rank - a.rank)
      .slice(0, CANDIDATES_PER_SLOT)
      .map(({ keyword }) => keyword);

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

/** Haiku가 고른 후보 안에서 슬롯마다 하나씩 가중 랜덤으로 뽑는다. */
export function drawKeywords(
  shortlist: Shortlist,
  picks: Picks,
  targetSeverity: number,
  recentUses: RecentUses,
  random: () => number = Math.random,
) {
  return SLOTS.flatMap((slot) => {
    const pool = shortlist[slot];
    const chosen = slot === "material" ? [] : pool.filter((keyword) => picks[slot].includes(keyword.id));
    const finalists = chosen.length > 0 ? chosen : pool;
    if (finalists.length === 0) return [];
    const weights = finalists.map(
      (keyword) => freshWeight(keyword, recentUses) * Math.exp(-Math.abs(keyword.severity - targetSeverity) / SEVERITY_SPREAD),
    );
    return [pick(finalists, weights, random)];
  });
}
