import { z } from "zod";

/**
 * 플레이어의 진행 상태. 브라우저(localStorage)가 들고 다니고, 로그인했으면 서버가 계정에도 적어 둔다.
 * 서버는 이 상태를 믿지 않는다. 받을 때마다 progress.ts에서 다시 따져 본다.
 */

export const LIMITS = {
  name: 12,
  noteText: 40,
  noteSrc: 60,
  noteCtx: 240,
  notes: 200,
  memo: 5000,
  searches: 200,
  query: 40,
  ids: 500,
  answer: 40,
} as const;

/** 본문 표기와 겹치는 글자는 이름과 메모 조각에서 뺀다. */
const clean = (max: number) =>
  z
    .string()
    .transform((value) => value.replace(/[\[\]{}]/g, "").trim().slice(0, max));

const idList = z
  .array(z.string().max(80))
  .transform((list) => [...new Set(list)].slice(0, LIMITS.ids));

export const noteSchema = z.object({
  id: z.string().min(1).max(40),
  /** 본문에서 누른 말. */
  text: clean(LIMITS.noteText),
  /** 어디서 봤는지. 예) "메신저 · 박채주" */
  src: clean(LIMITS.noteSrc),
  /** 그 말이 들어 있던 문장. */
  ctx: clean(LIMITS.noteCtx),
  at: z.number().int().nonnegative(),
});

export const boardStateSchema = z.object({
  /** 빈칸 id → 끌어다 놓은 말. */
  answers: z.record(z.string().max(40), z.string().max(LIMITS.answer)),
  solved: z.boolean(),
  tries: z.number().int().nonnegative().max(9999),
});

export const stateSchema = z.object({
  v: z.literal(1),
  caseId: z.string().max(80),
  playerName: clean(LIMITS.name),
  startedAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  playSeconds: z.number().int().nonnegative(),
  /** 열어 본 문서·대화·웹 문서의 id. */
  opened: idList,
  /** 물어본 질문 id. 순서가 곧 대화 기록의 순서다. "@<추리판 id>"는 메신저에서 맞힌 질문이다. */
  asked: idList,
  /** 브라우저에 적어 본 검색어. 찾은 문서는 여기서 다시 계산한다. */
  searches: z.array(z.string().max(LIMITS.query * 2)).transform((list) => [...new Set(list.map((q) => q.trim().slice(0, LIMITS.query)).filter(Boolean))].slice(-LIMITS.searches)),
  notes: z.array(noteSchema).transform((list) => list.filter((note) => note.text !== "").slice(0, LIMITS.notes)),
  memo: z.string().transform((value) => value.slice(0, LIMITS.memo)),
  boards: z.record(z.string().max(80), boardStateSchema),
});

export type Note = z.infer<typeof noteSchema>;
export type BoardState = z.infer<typeof boardStateSchema>;
export type GameState = z.infer<typeof stateSchema>;

export function newState(caseId: string, playerName: string, now = Date.now()): GameState {
  return {
    v: 1,
    caseId,
    playerName: playerName.replace(/[\[\]{}]/g, "").trim().slice(0, LIMITS.name),
    startedAt: now,
    updatedAt: now,
    playSeconds: 0,
    opened: [],
    asked: [],
    searches: [],
    notes: [],
    memo: "",
    boards: {},
  };
}

/** 모양이 맞지 않으면 null. 넘치는 값은 잘라 낸다. */
export function parseState(raw: unknown, caseId: string): GameState | null {
  const parsed = stateSchema.safeParse(raw);
  if (!parsed.success || parsed.data.caseId !== caseId || parsed.data.playerName === "") return null;
  return parsed.data;
}
