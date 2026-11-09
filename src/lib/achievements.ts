import type { ScoreBreakdown } from "./scoring";

export type AchievementContext = { text: string; score: number; breakdown: ScoreBreakdown };
export type AchievementRecord = AchievementContext & { shared: boolean };

type Achievement = { code: string; title: string; hint: string } & (
  | { test: (context: AchievementContext) => boolean } // 소원 하나로 달성
  | { testAll: (records: AchievementRecord[]) => boolean } // 쌓인 기록으로 달성
);

export const ACHIEVEMENTS: Achievement[] = [
  { code: "first_wish", title: "첫 번째 소원", hint: "소원을 처음 빌었다.", test: () => true },
  { code: "taboo_breaker", title: "금기를 건드린 자", hint: "지니의 금기를 빌었다.", test: (c) => c.breakdown.analysis.taboo !== "none" },
  { code: "genie_sweat", title: "지니를 긴장시킨 자", hint: "90점 이상을 받았다.", test: (c) => c.score >= 90 },
  {
    code: "short_and_sharp",
    title: "짧고 날카롭게",
    hint: "30자 이하로 잘 쓴 소원을 빌었다.",
    test: (c) => c.text.length <= 30 && c.breakdown.quality >= 70,
  },
  { code: "self_doomed", title: "자초한 재앙", hint: "30점 미만을 받았다.", test: (c) => c.score < 30 },
  { code: "epic", title: "대서사시", hint: "가장 긴 이야기를 받아냈다.", test: (c) => c.breakdown.tier === "long" },
  { code: "storyteller", title: "이야기꾼", hint: "이야기를 공유했다.", testAll: (records) => records.some((record) => record.shared) },
  { code: "regular", title: "램프의 단골", hint: "소원을 10번 빌었다.", testAll: (records) => records.length >= 10 },
  {
    code: "all_taboos",
    title: "모든 금기를 깬 자",
    hint: "세 가지 금기를 모두 빌었다.",
    testAll: (records) => new Set(records.map((record) => record.breakdown.analysis.taboo).filter((taboo) => taboo !== "none")).size === 3,
  },
];

/** 완료된 소원 기록에서 달성한 업적 코드를 모은다. */
export function earnedCodes(records: AchievementRecord[]) {
  const earned = ACHIEVEMENTS.filter((achievement) =>
    "testAll" in achievement ? achievement.testAll(records) : records.some(achievement.test),
  );
  return new Set(earned.map((achievement) => achievement.code));
}
