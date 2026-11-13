import type { GameState } from "@/engine/state";

/** 브라우저 저장. 로그인하지 않아도 진행이 남고, 로그인했을 때도 서버가 닿지 않으면 이것으로 이어 간다. */
const key = (caseId: string) => `j-son:${caseId}:v1`;

export function readLocal(caseId: string): unknown {
  try {
    const raw = localStorage.getItem(key(caseId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeLocal(caseId: string, state: GameState) {
  try {
    localStorage.setItem(key(caseId), JSON.stringify(state));
  } catch {
    // 저장 공간이 막혀 있어도 게임은 계속된다.
  }
}

export function clearLocal(caseId: string) {
  try {
    localStorage.removeItem(key(caseId));
  } catch {
    // 위와 같다.
  }
}
