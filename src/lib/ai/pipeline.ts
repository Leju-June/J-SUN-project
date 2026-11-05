import { setTimeout as sleep } from "node:timers/promises";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { TABOOS, type Analysis, type StoryTier } from "../scoring";
import { anthropic, ANALYSIS_MODEL, estimateCost, mockMode, RefusalError, STORY_MODEL } from "./client";
import { mockAnalysis, mockReview, mockStory } from "./mock";
import { analysisPrompt, ANALYSIS_SYSTEM, REVIEW_SYSTEM, reviewPrompt, STORY_SYSTEM, storyPrompt } from "./prompts";

const AnalysisSchema = z.object({
  taboo: z.enum(TABOOS),
  clarity: z.number(),
  realism: z.number(),
  density: z.number(),
  narrative: z.number(),
  keywords: z.array(z.string()),
});

const ReviewSchema = z.object({ approved: z.boolean() });

const clampScore = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export async function analyzeWish(wish: string): Promise<{ analysis: Analysis; costUsd: number }> {
  if (mockMode()) return { analysis: mockAnalysis(wish), costUsd: 0 };

  const response = await anthropic().messages.parse({
    model: ANALYSIS_MODEL,
    max_tokens: 2000,
    system: ANALYSIS_SYSTEM,
    output_config: { effort: "low", format: zodOutputFormat(AnalysisSchema) },
    messages: [{ role: "user", content: analysisPrompt(wish) }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) throw new RefusalError();

  const result = response.parsed_output;
  return {
    analysis: {
      ...result,
      clarity: clampScore(result.clarity),
      realism: clampScore(result.realism),
      density: clampScore(result.density),
      narrative: clampScore(result.narrative),
    },
    costUsd: estimateCost(ANALYSIS_MODEL, response.usage),
  };
}

type StoryInput = { wish: string; keywords: string[]; direction: string; tier: StoryTier };

/** 스토리를 생성하며 조각마다 onText를 호출하고, 추정 비용을 반환한다. */
export async function generateStory(input: StoryInput, onText: (text: string) => void) {
  if (mockMode()) {
    for (const chunk of mockStory(input.wish, input.keywords, input.tier).match(/[\s\S]{1,12}/g) ?? []) {
      onText(chunk);
      await sleep(30);
    }
    return 0;
  }

  const stream = anthropic().beta.messages.stream({
    model: STORY_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium" },
    system: [{ type: "text", text: STORY_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: storyPrompt(input) }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") onText(event.delta.text);
  }

  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new RefusalError();
  return estimateCost(STORY_MODEL, message.usage);
}

/** 공유 전에 실존 인물을 특정하는 내용이 있는지 검사한다. */
export async function reviewForShare(wish: string, story: string) {
  if (mockMode()) return mockReview(`${wish}\n${story}`);

  const response = await anthropic().messages.parse({
    model: ANALYSIS_MODEL,
    max_tokens: 2000,
    system: REVIEW_SYSTEM,
    output_config: { effort: "low", format: zodOutputFormat(ReviewSchema) },
    messages: [{ role: "user", content: reviewPrompt(wish, story) }],
  });
  return response.stop_reason !== "refusal" && response.parsed_output?.approved === true;
}
