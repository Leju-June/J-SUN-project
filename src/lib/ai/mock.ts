import { SCENE_DELIMITER } from "../scenes";
import type { Analysis, StoryTier, Taboo } from "../scoring";

// API 키 없이 흐름을 확인하기 위한 개발용 대체 구현이다.

function detectTaboo(wish: string): Taboo {
  if (/죽여|죽게|살해|없애/.test(wish)) return "kill";
  if (/사랑하게|좋아하게|반하게/.test(wish)) return "forced_love";
  if (/살려|되살|부활/.test(wish)) return "resurrection";
  return "none";
}

export function mockAnalysis(wish: string): Analysis {
  const conditions = wish.split(/[,，]|하며|하고|없이|않고/).length - 1;
  const clarity = Math.min(95, 15 + conditions * 25 + Math.min(wish.length, 40));
  return {
    taboo: detectTaboo(wish),
    clarity,
    realism: /날|불사|영원|순간이동|투명/.test(wish) ? 10 : 55,
    density: Math.min(90, 35 + conditions * 20),
    narrative: 55,
    keywords: wish.split(/\s+/).slice(0, 4),
  };
}

export function mockStory(wish: string, keywords: string[], tier: StoryTier) {
  const scenes = [
    `램프에서 피어오른 연기가 천천히 사람의 형상을 만들었다.\n\n"${wish}"\n\n지니는 그 말을 한 글자씩 되뇌며 웃었다. "좋아. 적힌 그대로 이루어 주지."`,
    `다음 날 아침, 소원은 정말로 이루어져 있었다. 처음에는 모든 것이 완벽해 보였다. 다만 머릿속에 '${keywords[0] ?? "무언가"}'라는 낯선 단어가 자꾸 떠오를 뿐이었다.`,
    `문제는 사흘째에 시작되었다. '${keywords[1] ?? "대가"}'. 지니는 거짓말을 하지 않았다. 소원에 적히지 않은 것까지 지켜줄 의무가 없었을 뿐이다.`,
    `"${keywords[2] ?? "그것"}"이 문 앞에 놓여 있었다. 램프는 이미 차갑게 식어 있었고, '${keywords[3] ?? "결말"}'만이 조용히 다가오고 있었다.\n\n(API 키를 설정하면 실제 스토리가 생성됩니다.)`,
  ];
  return scenes.slice(0, Math.max(tier.minScenes, 3)).join(`\n${SCENE_DELIMITER}\n`);
}

export function mockReview(text: string) {
  return !/\b[A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z]+\b/.test(text);
}
