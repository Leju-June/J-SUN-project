import { type Board, type BoardPart, type CaseData, boardParts } from "./case";
import { cluesOf } from "./grade";
import { type Progress, availability, boardLogId, isFinished } from "./progress";
import type { GameState } from "./state";

/**
 * 화면으로 내려보내는 내용. 지금 열린 범위만 담는다.
 * 정답, 단서 목록, 아직 열리지 않은 자료는 여기에 절대 넣지 않는다.
 */
export type LogEntry = {
  /** 질문 id, 또는 메신저에서 맞힌 질문이면 "@<추리판 id>". */
  id: string;
  question: string;
  lines: string[];
};

export type ThreadView = {
  id: string;
  name: string;
  role: string;
  intro: string[];
  log: LogEntry[];
  /** 아직 물어보지 않은 질문. */
  topics: { id: string; label: string }[];
  /** 이 대화에서 빈칸을 채워 보낼 수 있는 질문(추리판 id). */
  draft: string | null;
};

export type BoardView = {
  id: string;
  chapter: string;
  format: Board["format"];
  title: string;
  mail: { to: string; subject: string } | null;
  thread: string | null;
  parts: (BoardPart & { hint?: string })[];
  solved: boolean;
  /** 맞힌 뒤에 나오는 글. chat 형식은 대화 기록에 나오므로 비워 둔다. */
  solvedLines: string[];
  /** chat 형식에서 틀렸을 때 상대가 하는 말. */
  failLines: string[];
};

export type ArchiveItem = {
  label: string;
  kind: "person" | "place" | "time" | "thing";
  /** 단서 노트에 적어 둔 출처. 노트에서 지웠으면 없다. */
  src: string | null;
  ctx: string | null;
};

export type ArchiveEntry = {
  boardId: string;
  title: string;
  /** 빈칸이 채워진 완성 문장. */
  sentence: string;
  items: ArchiveItem[];
};

export type View = {
  caseId: string;
  title: string;
  episode: string;
  badge: string | null;
  date: string;
  station: string;
  playerName: string;
  chapters: { id: string; title: string; goal: string; open: boolean; lockedBoards: number }[];
  /** 지금 진행 중인 장. */
  current: string;
  documents: { id: string; title: string; filename: string; lines: string[] }[];
  threads: ThreadView[];
  browser: { name: string; pages: { id: string; title: string; site: string; url: string; lines: string[] }[] } | null;
  boards: BoardView[];
  archive: ArchiveEntry[];
  ending: { title: string; lines: string[]; outro: string | null } | null;
};

const fill = (text: string, state: GameState) => text.replaceAll("{player}", state.playerName);

/** 빈칸에 플레이어가 넣은 말을 채운 문장. */
function filledSentence(board: Board, answers: Record<string, string>) {
  return boardParts(board.text)
    .map((part) => (part.t === "text" ? part.v : (answers[part.id] ?? "")))
    .join("")
    .replace(/\s*\n\s*/g, " ")
    .trim();
}

export function buildView(data: CaseData, state: GameState, progress: Progress): View {
  const { met, threadOpen, boardOpen, webOpen } = availability(data, progress);
  const lines = (list: string[]) => list.map((line) => fill(line, state));
  const openBoards = data.boards.filter(boardOpen);

  const threads: ThreadView[] = data.threads.filter(threadOpen).map((thread) => {
    const byId = new Map(thread.topics.map((topic) => [topic.id, topic]));
    const chatBoards = data.boards.filter((board) => board.format === "chat" && board.thread === thread.id);
    const log: LogEntry[] = [];
    for (const askedId of progress.asked) {
      const topic = byId.get(askedId);
      if (topic) log.push({ id: topic.id, question: fill(topic.label, state), lines: lines(topic.lines) });
      const board = chatBoards.find((b) => boardLogId(b.id) === askedId);
      if (board) log.push({ id: askedId, question: filledSentence(board, state.boards[board.id]?.answers ?? {}), lines: lines(board.solved) });
    }
    return {
      id: thread.id,
      name: thread.name,
      role: thread.role,
      intro: lines(thread.intro),
      log,
      topics: thread.topics.filter((topic) => !progress.askedSet.has(topic.id) && met(topic.requires)).map((topic) => ({ id: topic.id, label: fill(topic.label, state) })),
      draft: chatBoards.find((board) => boardOpen(board) && !progress.solved.has(board.id))?.id ?? null,
    };
  });

  const boards: BoardView[] = openBoards.map((board) => {
    const solved = progress.solved.has(board.id);
    return {
      id: board.id,
      chapter: board.chapter,
      format: board.format,
      title: board.title,
      mail: board.mail ?? null,
      thread: board.thread ?? null,
      parts: boardParts(board.text).map((part) => (part.t === "blank" ? { ...part, hint: board.blanks[part.id]?.hint } : part)),
      solved,
      solvedLines: solved && board.format !== "chat" ? lines(board.solved) : [],
      failLines: board.format === "chat" ? lines(board.fail) : [],
    };
  });

  // 단서 보관함: 맞힌 추리판에 쓴 단서를, 완성된 문장과 처음 적어 둔 출처와 함께 모은다.
  const archive: ArchiveEntry[] = openBoards
    .filter((board) => progress.solved.has(board.id))
    .map((board) => {
      const answers = state.boards[board.id]?.answers ?? {};
      const items: ArchiveItem[] = Object.entries(board.blanks).map(([blankId, blank]) => {
        const clue = data.clues.find((c) => blank.answer.includes(c.id) && cluesOf(data, answers[blankId] ?? "").has(c.id)) ?? data.clues.find((c) => c.id === blank.answer[0])!;
        const note = state.notes.find((n) => cluesOf(data, n.text).has(clue.id));
        return { label: clue.label, kind: clue.kind, src: note?.src ?? null, ctx: note?.ctx ?? null };
      });
      return { boardId: board.id, title: board.title, sentence: filledSentence(board, answers), items };
    });

  const openChapters = data.chapters.filter((chapter) => progress.chapters.has(chapter.id));
  const finished = isFinished(data, progress);

  return {
    caseId: data.id,
    title: data.title,
    episode: data.episode,
    badge: data.badge ?? null,
    date: data.date,
    station: data.station,
    playerName: state.playerName,
    // 열리지 않은 장은 제목도 내보내지 않는다.
    chapters: data.chapters.map((chapter) => {
      const open = progress.chapters.has(chapter.id);
      return {
        id: chapter.id,
        title: open ? chapter.title : "???",
        goal: open ? chapter.goal : "",
        open,
        lockedBoards: open ? data.boards.filter((board) => board.chapter === chapter.id && !boardOpen(board)).length : 0,
      };
    }),
    current: openChapters[openChapters.length - 1].id,
    documents: data.documents
      .filter((doc) => progress.chapters.has(doc.chapter) && met(doc.requires))
      .map((doc) => ({ id: doc.id, title: doc.title, filename: doc.filename, lines: lines(doc.lines) })),
    threads,
    browser:
      webOpen() && data.web
        ? {
            name: data.web.name,
            pages: data.web.pages.filter((page) => progress.found.has(page.id)).map((page) => ({ id: page.id, title: page.title, site: page.site, url: page.url, lines: lines(page.lines) })),
          }
        : null,
    boards,
    archive,
    ending: finished ? { title: data.ending.title, lines: lines(data.ending.lines), outro: data.ending.outro ?? null } : null,
  };
}
