import type { ScoreBreakdown } from "./scoring";

export type AchievementContext = { text: string; score: number; breakdown: ScoreBreakdown };

export const ACHIEVEMENTS = [
  { code: "first_wish", title: "첫 번째 소원", test: () => true },
  { code: "taboo_breaker", title: "금기를 건드린 자", test: (c: AchievementContext) => c.breakdown.analysis.taboo !== "none" },
  { code: "genie_sweat", title: "지니를 긴장시킨 자", test: (c: AchievementContext) => c.score >= 90 },
  { code: "short_and_sharp", title: "짧고 날카롭게", test: (c: AchievementContext) => c.text.length <= 30 && c.breakdown.quality >= 70 },
];

/** 이번 소원으로 조건을 만족한 업적을 반환한다. */
export function matchAchievements(context: AchievementContext) {
  return ACHIEVEMENTS.filter((achievement) => achievement.test(context)).map(({ code, title }) => ({ code, title }));
}
