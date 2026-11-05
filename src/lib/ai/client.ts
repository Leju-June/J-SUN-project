import Anthropic from "@anthropic-ai/sdk";

export const STORY_MODEL = process.env.JEENEE_STORY_MODEL ?? "claude-opus-5-5";
export const ANALYSIS_MODEL = process.env.JEENEE_ANALYSIS_MODEL ?? "claude-haiku-5-5";

// 입력/출력 100만 토큰당 USD. 하루 지출 상한 계산에 쓰는 추정 단가다.
const PRICES: Record<string, [number, number]> = {
  "claude-fable-5-1": [10, 50],
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

export class RefusalError extends Error {}

// 운영 환경에서 키가 빠져도 샘플로 넘어가지 않도록 명시적으로 켜야 동작한다.
export const mockMode = () => !process.env.ANTHROPIC_API_KEY && process.env.JEENEE_MOCK_AI === "1";

let client: Anthropic | undefined;

export function anthropic() {
  client ??= new Anthropic();
  return client;
}

export function estimateCost(model: string, usage: { input_tokens: number; output_tokens: number }) {
  const [input, output] = PRICES[model] ?? PRICES["claude-opus-5-5"];
  return (usage.input_tokens * input + usage.output_tokens * output) / 1_000_000;
}
