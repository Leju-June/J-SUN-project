import type { Board, CaseData } from "./case";
import type { Note } from "./state";

/** 띄어쓰기와 대소문자, 전각/반각 차이는 무시한다. */
export const normalize = (text: string) => text.normalize("NFKC").toLowerCase().replace(/\s+/g, "");

/** 감싸지 않은 어절을 눌러 조사가 붙은 채로 적힌 말도 받아 준다. 긴 것부터 떼어 본다. */
const PARTICLES = ["이라고", "으로", "에서", "에게", "한테", "이랑", "까지", "부터", "마다", "은", "는", "이", "가", "을", "를", "에", "의", "도", "만", "로", "와", "과", "씨", "님"];

type ClueIndex = Map<string, Set<string>>;
const indexCache = new WeakMap<CaseData, ClueIndex>();

function clueIndex(data: CaseData): ClueIndex {
  let index = indexCache.get(data);
  if (!index) {
    index = new Map();
    for (const clue of data.clues) {
      for (const word of [clue.label, ...clue.aliases]) {
        const key = normalize(word);
        if (!index.has(key)) index.set(key, new Set());
        index.get(key)!.add(clue.id);
      }
    }
    indexCache.set(data, index);
  }
  return index;
}

/** 적힌 말이 가리키는 단서 id들. 아무 단서도 아니면 빈 집합. */
export function cluesOf(data: CaseData, text: string): Set<string> {
  const index = clueIndex(data);
  const key = normalize(text);
  const exact = index.get(key);
  if (exact) return exact;
  for (const particle of PARTICLES) {
    if (key.length > particle.length + 1 && key.endsWith(particle)) {
      const stem = index.get(key.slice(0, -particle.length));
      if (stem) return stem;
    }
  }
  return new Set();
}

const hits = (data: CaseData, text: string | undefined, accepted: string[]) => {
  if (!text) return false;
  const ids = cluesOf(data, text);
  return accepted.some((id) => ids.has(id));
};

export type Hint = "missing" | "review" | null;

export type Grade = {
  correct: number;
  total: number;
  solved: boolean;
  /** 한두 칸만 틀렸을 때만 준다. missing: 틀린 칸의 단서가 노트에 없다 · review: 노트에 있다 */
  hint: Hint;
};

/** 어느 칸이 틀렸는지는 돌려주지 않는다. 맞은 개수와 힌트 종류만 알려 준다. */
export function grade(data: CaseData, board: Board, answers: Record<string, string>, notes: Pick<Note, "text">[]): Grade {
  const entries = Object.entries(board.blanks);
  const wrong = entries.filter(([blankId, blank]) => !hits(data, answers[blankId], blank.answer));
  const total = entries.length;
  const correct = total - wrong.length;
  let hint: Hint = null;
  if (wrong.length >= 1 && wrong.length <= 2) {
    const missing = wrong.some(([, blank]) => !notes.some((note) => hits(data, note.text, blank.answer)));
    hint = missing ? "missing" : "review";
  }
  return { correct, total, solved: wrong.length === 0, hint };
}

export const isSolvedBy = (data: CaseData, board: Board, answers: Record<string, string>) =>
  Object.entries(board.blanks).every(([blankId, blank]) => hits(data, answers[blankId], blank.answer));

export const HINT_TEXT: Record<Exclude<Hint, null>, string> = {
  missing: "아직 찾지 못한 단서가 있는 것 같아.",
  review: "지금까지 모은 단서들을 잘 살펴봐야해.",
};
