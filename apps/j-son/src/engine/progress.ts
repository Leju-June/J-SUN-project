import type { Board, CaseData, Page, Thread, Topic } from "./case";
import { isSolvedBy, normalize } from "./grade";
import type { GameState } from "./state";

/**
 * 상태에서 "지금 어디까지 열렸는가"를 다시 계산한다.
 *
 * 브라우저가 보낸 상태는 고쳐 쓸 수 있으므로, 풀었다는 표시를 믿지 않고 적어 낸 답을 다시 채점한다.
 * 정답을 모르면 다음 자료가 열리지 않는다.
 */
export type Progress = {
  chapters: Set<string>;
  /** 조건을 채운 질문만, 물어본 순서대로. 메신저에서 맞힌 질문("@<추리판 id>")도 섞여 있다. */
  asked: string[];
  askedSet: Set<string>;
  solved: Set<string>;
  /** 검색으로 찾아낸 웹 문서. */
  found: Set<string>;
};

/** 메신저에서 맞힌 질문(chat 형식 추리판)이 대화 기록에 남는 이름. */
export const boardLogId = (boardId: string) => `@${boardId}`;

export function matchesQuery(page: Page, query: string) {
  const q = normalize(query);
  if (q.length < 2) return false;
  return page.keywords.some((keyword) => {
    const k = normalize(keyword);
    return q.includes(k) || k.includes(q);
  });
}

/** 조건 확인기. 해금 계산과 화면 구성, 검색이 같이 쓴다. */
export function availability(data: CaseData, progress: Omit<Progress, "asked">) {
  const met = (conds: string[]) =>
    conds.every((cond) => {
      const [kind, target] = cond.split(":");
      if (kind === "board") return progress.solved.has(target);
      if (kind === "topic") return progress.askedSet.has(target);
      if (kind === "page") return progress.found.has(target);
      return progress.chapters.has(target);
    });
  const threadOpen = (thread: Thread) => progress.chapters.has(thread.chapter) && met(thread.requires);
  const boardOpen = (board: Board) => {
    if (!progress.chapters.has(board.chapter) || !met(board.requires)) return false;
    if (board.format !== "chat") return true;
    const thread = data.threads.find((t) => t.id === board.thread);
    return !!thread && threadOpen(thread);
  };
  const webOpen = () => !!data.web && progress.chapters.has(data.web.chapter);
  return { met, threadOpen, boardOpen, webOpen };
}

export function resolve(data: CaseData, state: GameState): Progress {
  const sets = { chapters: new Set<string>(), askedSet: new Set<string>(), solved: new Set<string>(), found: new Set<string>() };
  const { met, threadOpen, boardOpen, webOpen } = availability(data, sets);

  const topics = new Map<string, { thread: Thread; topic: Topic }>();
  for (const thread of data.threads) for (const topic of thread.topics) topics.set(topic.id, { thread, topic });

  const claimed = data.boards.filter((board) => {
    const entry = state.boards[board.id];
    return !!entry?.solved && isSolvedBy(data, board, entry.answers);
  });
  const searched = data.web?.pages.filter((page) => state.searches.some((query) => matchesQuery(page, query))) ?? [];

  // 조건이 서로 물려 있으므로 더 열리는 것이 없을 때까지 돈다.
  for (let changed = true; changed; ) {
    changed = false;
    const add = (set: Set<string>, value: string) => {
      if (!set.has(value)) {
        set.add(value);
        changed = true;
      }
    };
    data.chapters.forEach((chapter, i) => {
      if (i === 0 || met(chapter.requires)) add(sets.chapters, chapter.id);
    });
    for (const board of claimed) if (boardOpen(board)) add(sets.solved, board.id);
    for (const askedId of state.asked) {
      const entry = topics.get(askedId);
      if (entry && threadOpen(entry.thread) && met(entry.topic.requires)) add(sets.askedSet, askedId);
    }
    if (webOpen()) for (const page of searched) if (met(page.requires)) add(sets.found, page.id);
  }

  // 대화 기록 순서: 물어본 순서 그대로, 메신저에서 맞힌 질문도 그 사이에 낀다.
  const chatSolved = new Set(data.boards.filter((board) => board.format === "chat" && sets.solved.has(board.id)).map((board) => boardLogId(board.id)));
  const asked = state.asked.filter((askedId) => sets.askedSet.has(askedId) || chatSolved.has(askedId));
  for (const logId of chatSolved) if (!asked.includes(logId)) asked.push(logId);

  return { ...sets, asked };
}

/** 검색 결과. 아직 열리지 않은 문서는 걸리지 않는다. */
export function searchPages(data: CaseData, progress: Progress, query: string): Page[] {
  const { met, webOpen } = availability(data, progress);
  if (!webOpen() || !data.web) return [];
  return data.web.pages.filter((page) => met(page.requires) && matchesQuery(page, query));
}

/** 사건(데모)을 끝까지 풀었는가. */
export const isFinished = (data: CaseData, progress: Progress) => progress.solved.has(data.ending.after);
