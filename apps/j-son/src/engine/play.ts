import { z } from "zod";
import type { CaseData } from "./case";
import { type Grade, HINT_TEXT, grade } from "./grade";
import { availability, boardLogId, isFinished, resolve, searchPages } from "./progress";
import { plainText } from "./rich";
import { type BoardState, type GameState, LIMITS, parseState } from "./state";
import { type View, buildView } from "./view";

/** 화면이 서버에 보내는 요청. 상태는 늘 통째로 같이 온다. */
export const requestSchema = z.object({
  caseId: z.string().max(80),
  state: z.unknown(),
  action: z
    .discriminatedUnion("type", [
      z.object({ type: z.literal("load") }),
      z.object({ type: z.literal("sync") }),
      z.object({ type: z.literal("reset") }),
      z.object({ type: z.literal("search"), query: z.string().max(LIMITS.query * 2) }),
      z.object({ type: z.literal("submit"), boardId: z.string().max(80), answers: z.record(z.string().max(40), z.string().max(LIMITS.answer)) }),
    ])
    .default({ type: "sync" }),
});

export type PlayRequest = z.input<typeof requestSchema>;
export type PlayAction = z.infer<typeof requestSchema>["action"];

export type SearchResult = { id: string; title: string; site: string; url: string; snippet: string };

export type SubmitResult = Pick<Grade, "correct" | "total" | "solved"> & {
  /** 한두 칸 틀렸을 때의 한마디. */
  hint: string | null;
  /** 화면이 자기 상태에 덮어쓸 추리판 기록. */
  board: BoardState;
  /** 메신저에서 맞힌 질문이면 대화 기록에 끼워 넣을 id. */
  log: string | null;
};

export type PlayResponse = {
  user: { displayName: string } | null;
  /** 계정에 저장됐는가. 로그인하지 않았으면 false. */
  saved: boolean;
  /** load 때만 의미가 있다. 계정에 더 새로운 진행이 있으면 그것이 온다. */
  state: GameState | null;
  view: View | null;
  search?: { query: string; results: SearchResult[] };
  submit?: SubmitResult;
};

export type Outcome = {
  state: GameState;
  view: View;
  finished: boolean;
  search?: PlayResponse["search"];
  submit?: SubmitResult;
  /** 계정에 남길 제출 기록. */
  submission?: { boardId: string; answers: Record<string, string>; correct: number; total: number };
};

/** 상태 하나와 행동 하나를 받아 다음 상태와 화면을 낸다. 저장이나 로그인은 여기서 다루지 않는다. */
export function play(data: CaseData, state: GameState, action: PlayAction): Outcome | { error: string } {
  let next = state;
  let search: Outcome["search"];
  let submit: Outcome["submit"];
  let submission: Outcome["submission"];

  if (action.type === "search") {
    const query = action.query.trim().slice(0, LIMITS.query);
    if (query) {
      next = { ...next, searches: [...next.searches.filter((q) => q !== query), query].slice(-LIMITS.searches) };
      const results = searchPages(data, resolve(data, next), query);
      search = {
        query,
        results: results.map((page) => ({
          id: page.id,
          title: page.title,
          site: page.site,
          url: page.url,
          snippet: plainText(page.lines.find((line) => !/^(# |; )/.test(line) && line.trim() !== "") ?? "").slice(0, 90),
        })),
      };
    } else search = { query, results: [] };
  }

  if (action.type === "submit") {
    const board = data.boards.find((b) => b.id === action.boardId);
    const before = resolve(data, next);
    if (!board || !availability(data, before).boardOpen(board)) return { error: "아직 열리지 않은 추리판입니다." };
    const previous = next.boards[board.id];
    if (before.solved.has(board.id) && previous) {
      // 이미 푼 추리판은 다시 채점하지 않는다.
      submit = { correct: Object.keys(board.blanks).length, total: Object.keys(board.blanks).length, solved: true, hint: null, board: previous, log: null };
    } else {
      const answers = Object.fromEntries(Object.keys(board.blanks).map((blankId) => [blankId, (action.answers[blankId] ?? "").trim()]));
      const result = grade(data, board, answers, next.notes);
      const entry: BoardState = { answers, solved: result.solved, tries: Math.min((previous?.tries ?? 0) + 1, 9999) };
      const log = result.solved && board.format === "chat" ? boardLogId(board.id) : null;
      next = { ...next, boards: { ...next.boards, [board.id]: entry }, asked: log && !next.asked.includes(log) ? [...next.asked, log] : next.asked };
      submit = { correct: result.correct, total: result.total, solved: result.solved, hint: result.hint ? HINT_TEXT[result.hint] : null, board: entry, log };
      submission = { boardId: board.id, answers, correct: result.correct, total: result.total };
    }
  }

  const progress = resolve(data, next);
  return { state: next, view: buildView(data, next, progress), finished: isFinished(data, progress), search, submit, submission };
}

/** 브라우저가 보낸 상태를 읽는다. 플레이 시간은 시작한 뒤 흐른 시간보다 길 수 없다. */
export function readState(raw: unknown, caseId: string, now = Date.now()): GameState | null {
  const state = parseState(raw, caseId);
  if (!state) return null;
  const elapsed = Math.max(0, Math.ceil((now - state.startedAt) / 1000));
  return { ...state, playSeconds: Math.min(state.playSeconds, elapsed) };
}
