export const TABOOS = ["none", "kill", "forced_love", "resurrection"] as const;
export type Taboo = (typeof TABOOS)[number];

export type Analysis = {
  taboo: Taboo;
  clarity: number; // C: 조건이 얼마나 구체적인가
  realism: number; // R: 얼마나 현실적인가
  density: number; // D: 낭비 없이 의미 있는 조건을 담았는가
  narrative: number; // N: 이야기로 풀어낼 거리가 있는가
  keywords: string[]; // 소원에서 뽑은 확정 키워드
};

export type StoryTier = { name: "short" | "medium" | "long"; minChars: number; maxChars: number; minScenes: number; maxScenes: number };

export type ScoreBreakdown = {
  analysis: Analysis;
  severityAverage: number;
  misfortune: number;
  quality: number;
  tier: StoryTier["name"];
};

const clamp = (value: number) => Math.min(100, Math.max(0, value));

function applyTaboo(misfortune: number, taboo: Taboo) {
  return clamp(taboo === "none" ? misfortune : Math.max(misfortune + 40, 80));
}

function baseMisfortune({ clarity, realism }: Analysis) {
  return (100 - clarity) * 0.5 + (100 - realism) * 0.4 * (1 - (clarity / 100) * 0.7);
}

/** 키워드를 뽑기 전의 불행도. 어떤 강도의 키워드를 뽑을지 정할 때 쓴다. */
export function misfortuneBeforeKeywords(analysis: Analysis) {
  return applyTaboo(baseMisfortune(analysis), analysis.taboo);
}

export function computeMisfortune(analysis: Analysis, severityAverage: number) {
  return applyTaboo(baseMisfortune(analysis) + severityAverage * 0.1, analysis.taboo);
}

export function computeQuality({ density, narrative }: Analysis) {
  return clamp(density * 0.6 + narrative * 0.4);
}

export function computeScore(misfortune: number, quality: number) {
  return Math.round((100 - misfortune) * 0.3 + quality * 0.7);
}

export function storyTier(quality: number): StoryTier {
  if (quality < 40) return { name: "short", minChars: 800, maxChars: 1200, minScenes: 3, maxScenes: 4 };
  if (quality < 70) return { name: "medium", minChars: 1500, maxChars: 2200, minScenes: 5, maxScenes: 7 };
  return { name: "long", minChars: 3000, maxChars: 4000, minScenes: 8, maxScenes: 12 };
}

export function storyDirection(misfortune: number, taboo: Taboo) {
  if (taboo === "kill") return "지니의 금기인 살인을 빌었다. 죽음의 대가가 소원을 빈 사람에게 되돌아오는 재앙으로 끝낸다.";
  if (taboo === "forced_love") return "지니의 금기인 사랑 강요를 빌었다. 얻어낸 마음이 사랑이 아닌 무언가임을 깨닫는 재앙으로 끝낸다.";
  if (taboo === "resurrection") return "지니의 금기인 부활을 빌었다. 돌아온 것이 예전의 그 존재가 아님을 깨닫는 재앙으로 끝낸다.";
  if (misfortune < 30) return "소원은 거의 완벽하게 이뤄지지만, 지니가 찾아낸 작은 틈 때문에 씁쓸한 대가가 남는다.";
  if (misfortune < 60) return "소원이 문자 그대로 이뤄지면서 생기는 아이러니로 이야기를 끝낸다.";
  if (misfortune < 85) return "문자 그대로 이뤄진 소원이 주인공의 삶을 서서히 무너뜨린다.";
  return "지니가 직접 개입해 소원 전체를 되돌릴 수 없는 재앙으로 만든다.";
}

/** 점수의 이유를 드러내지 않는 지니의 한마디. */
export function genieLine(score: number) {
  if (score >= 90) return "…이번엔 나도 진땀을 뺐다.";
  if (score >= 70) return "제법이군. 하지만 빈틈은 있었어.";
  if (score >= 40) return "나쁘지 않아. 나에게는 말이지.";
  return "고맙다. 덕분에 아주 즐거웠어.";
}
