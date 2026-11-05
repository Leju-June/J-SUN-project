export const SLOTS = ["loophole", "price", "material", "ending"] as const;
export type Slot = (typeof SLOTS)[number];

export type Candidate = {
  id: number;
  word: string;
  slot: string;
  baseWeight: number;
  severity: number;
  similarity: number;
};

// τ가 작을수록 소원과 연관된 키워드가, 클수록 무작위에 가까운 키워드가 뽑힌다.
const SLOT_TAU: Record<Slot, number> = { loophole: 0.1, price: 0.2, material: 2, ending: 0.25 };
const SEVERITY_SPREAD = 30;

export function keywordWeight(candidate: Candidate, tau: number, targetSeverity: number) {
  return (
    candidate.baseWeight *
    Math.exp(candidate.similarity / tau) *
    Math.exp(-Math.abs(candidate.severity - targetSeverity) / SEVERITY_SPREAD)
  );
}

function pick<T>(items: T[], weights: number[], random: () => number) {
  let remaining = random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (let i = 0; i < items.length; i++) {
    remaining -= weights[i];
    if (remaining <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** 슬롯마다 키워드를 하나씩 가중 랜덤으로 뽑는다. */
export function drawKeywords(candidates: Candidate[], targetSeverity: number, random: () => number = Math.random) {
  return SLOTS.flatMap((slot) => {
    const pool = candidates.filter((candidate) => candidate.slot === slot);
    if (pool.length === 0) return [];
    const weights = pool.map((candidate) => keywordWeight(candidate, SLOT_TAU[slot], targetSeverity));
    return [pick(pool, weights, random)];
  });
}
