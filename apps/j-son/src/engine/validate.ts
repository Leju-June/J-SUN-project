import { type CaseData, boardParts } from "./case";
import { cluesOf, normalize } from "./grade";
import { availability, boardLogId, resolve } from "./progress";
import { bracketTokens } from "./rich";
import { type GameState, newState } from "./state";

/**
 * 사건 데이터 검증. 빌드와 테스트에서 돌린다.
 *
 * 1. 참조가 맞는가: 없는 장·추리판·질문·단서를 가리키지 않는가, id가 겹치지 않는가.
 * 2. 끝까지 갈 수 있는가: 처음부터 모든 것을 열어 가며 풀어 보는 흉내를 낸다.
 *    추리판을 풀 차례가 됐을 때, 정답 단서를 그때까지 열린 본문에서 누를 수 있어야 한다.
 */
export function validateCase(data: CaseData): string[] {
  const errors: string[] = [];
  const seen = new Map<string, string>();
  const claim = (kind: string, id: string) => {
    const key = `${kind}:${id}`;
    if (seen.has(key)) errors.push(`${kind} id가 겹칩니다: ${id}`);
    seen.set(key, kind);
  };

  data.chapters.forEach((chapter) => claim("chapter", chapter.id));
  data.clues.forEach((clue) => claim("clue", clue.id));
  data.documents.forEach((doc) => claim("document", doc.id));
  data.threads.forEach((thread) => {
    claim("thread", thread.id);
    thread.topics.forEach((topic) => claim("topic", topic.id));
  });
  data.web?.pages.forEach((page) => claim("page", page.id));
  data.boards.forEach((board) => claim("board", board.id));

  const has = (kind: string, id: string) => seen.has(`${kind}:${id}`);
  const checkChapter = (where: string, chapter: string) => {
    if (!has("chapter", chapter)) errors.push(`${where}: 없는 장 ${chapter}`);
  };
  const checkConds = (where: string, conds: string[]) => {
    for (const cond of conds) {
      const [kind, target] = cond.split(":");
      if (!has(kind, target)) errors.push(`${where}: 조건 ${cond}가 가리키는 것이 없습니다`);
    }
  };

  data.chapters.forEach((chapter, i) => {
    checkConds(`장 ${chapter.id}`, chapter.requires);
    if (i > 0 && chapter.requires.length === 0) errors.push(`장 ${chapter.id}: 첫 장이 아니면 requires가 있어야 합니다`);
  });
  data.documents.forEach((doc) => {
    checkChapter(`문서 ${doc.id}`, doc.chapter);
    checkConds(`문서 ${doc.id}`, doc.requires);
  });
  data.threads.forEach((thread) => {
    checkChapter(`대화 ${thread.id}`, thread.chapter);
    checkConds(`대화 ${thread.id}`, thread.requires);
    thread.topics.forEach((topic) => checkConds(`질문 ${topic.id}`, topic.requires));
  });
  if (data.web) {
    checkChapter("web.yaml", data.web.chapter);
    data.web.pages.forEach((page) => checkConds(`웹 문서 ${page.id}`, page.requires));
  }
  if (!has("board", data.ending.after)) errors.push(`ending.after: 없는 추리판 ${data.ending.after}`);

  // 단서의 말이 서로 겹치면 어느 단서인지 가릴 수 없다.
  const words = new Map<string, string>();
  for (const clue of data.clues) {
    for (const word of [clue.label, ...clue.aliases]) {
      const key = normalize(word);
      const other = words.get(key);
      if (other && other !== clue.id) errors.push(`단서 ${clue.id}와 ${other}가 같은 말 "${word}"를 씁니다`);
      words.set(key, clue.id);
    }
  }

  const usedClues = new Set<string>();
  for (const board of data.boards) {
    const where = `추리판 ${board.id}`;
    checkChapter(where, board.chapter);
    checkConds(where, board.requires);
    if (board.format === "chat" && !(board.thread && has("thread", board.thread))) errors.push(`${where}: chat 형식은 thread가 있어야 합니다`);
    if (board.format === "mail" && !board.mail) errors.push(`${where}: mail 형식은 mail(to, subject)이 있어야 합니다`);
    const inText = boardParts(board.text).flatMap((part) => (part.t === "blank" ? [part.id] : []));
    const defined = Object.keys(board.blanks);
    for (const blankId of inText) if (!defined.includes(blankId)) errors.push(`${where}: 글의 {${blankId}}에 맞는 blanks 항목이 없습니다`);
    for (const blankId of defined) if (!inText.includes(blankId)) errors.push(`${where}: blanks.${blankId}가 글에 없습니다`);
    if (new Set(inText).size !== inText.length) errors.push(`${where}: 같은 빈칸 이름이 두 번 나옵니다`);
    for (const [blankId, blank] of Object.entries(board.blanks)) {
      for (const clueId of blank.answer) {
        if (!has("clue", clueId)) errors.push(`${where}: blanks.${blankId}가 없는 단서 ${clueId}를 가리킵니다`);
        usedClues.add(clueId);
      }
    }
  }
  for (const clue of data.clues) if (!usedClues.has(clue.id)) errors.push(`단서 ${clue.id}는 어느 추리판에서도 쓰이지 않습니다`);

  if (errors.length > 0) return errors;
  return simulate(data);
}

/** 열리는 대로 다 묻고, 다 검색하고, 풀 수 있는 추리판을 푸는 플레이를 흉내 낸다. */
function simulate(data: CaseData): string[] {
  const errors: string[] = [];
  const state: GameState = newState(data.id, "검증");
  const labelOf = (clueId: string) => data.clues.find((clue) => clue.id === clueId)!.label;

  for (let round = 0; round < 200; round++) {
    const progress = resolve(data, state);
    const { met, threadOpen, boardOpen, webOpen } = availability(data, progress);
    let moved = false;

    // 지금까지 열린 본문에서 누를 수 있는 말.
    const tokens: string[] = [];
    const read = (list: string[]) => list.forEach((line) => tokens.push(...bracketTokens(line)));
    data.documents.filter((doc) => progress.chapters.has(doc.chapter) && met(doc.requires)).forEach((doc) => read(doc.lines));
    for (const thread of data.threads.filter(threadOpen)) {
      read(thread.intro);
      for (const topic of thread.topics) {
        if (progress.askedSet.has(topic.id)) read([topic.label, ...topic.lines]);
        else if (met(topic.requires)) {
          read([topic.label]);
          state.asked.push(topic.id);
          moved = true;
        }
      }
    }
    if (webOpen() && data.web) {
      for (const page of data.web.pages) {
        if (progress.found.has(page.id)) read(page.lines);
        else if (met(page.requires)) {
          state.searches.push(page.keywords[0]);
          moved = true;
        }
      }
    }
    data.boards.filter((board) => board.format === "chat" && progress.solved.has(board.id)).forEach((board) => read(board.solved));
    if (moved) continue;

    // 더 읽을 것이 없을 때 추리판을 푼다. 이때 정답을 누를 수 있어야 한다.
    for (const board of data.boards.filter((b) => boardOpen(b) && !progress.solved.has(b.id))) {
      for (const [blankId, blank] of Object.entries(board.blanks)) {
        const reachable = tokens.some((token) => blank.answer.some((clueId) => cluesOf(data, token).has(clueId)));
        if (!reachable) errors.push(`추리판 ${board.id}: 빈칸 ${blankId}의 정답(${blank.answer.map(labelOf).join(", ")})을 그때까지 열린 본문에서 누를 수 없습니다`);
      }
      state.boards[board.id] = { answers: Object.fromEntries(Object.entries(board.blanks).map(([blankId, blank]) => [blankId, labelOf(blank.answer[0])])), solved: true, tries: 1 };
      if (board.format === "chat") state.asked.push(boardLogId(board.id));
      moved = true;
    }
    if (!moved) break;
  }

  const end = resolve(data, state);
  const { met, threadOpen } = availability(data, end);
  for (const chapter of data.chapters) if (!end.chapters.has(chapter.id)) errors.push(`장 ${chapter.id}: 끝까지 풀어도 열리지 않습니다`);
  for (const board of data.boards) if (!end.solved.has(board.id)) errors.push(`추리판 ${board.id}: 끝까지 가도 풀 수 없습니다`);
  for (const doc of data.documents) if (!(end.chapters.has(doc.chapter) && met(doc.requires))) errors.push(`문서 ${doc.id}: 끝까지 가도 열리지 않습니다`);
  for (const thread of data.threads) {
    if (!threadOpen(thread)) errors.push(`대화 ${thread.id}: 끝까지 가도 열리지 않습니다`);
    for (const topic of thread.topics) if (!end.askedSet.has(topic.id)) errors.push(`질문 ${topic.id}: 끝까지 가도 물어볼 수 없습니다`);
  }
  for (const page of data.web?.pages ?? []) {
    if (!end.found.has(page.id)) errors.push(`웹 문서 ${page.id}: 끝까지 가도 검색되지 않습니다`);
    // 한 글자 검색어는 검색에서 걸리지 않는다.
    if (page.keywords.some((keyword) => normalize(keyword).length < 2)) errors.push(`웹 문서 ${page.id}: 검색어는 두 글자 이상이어야 합니다`);
  }
  if (!end.solved.has(data.ending.after)) errors.push("결말에 닿을 수 없습니다");
  return errors;
}
