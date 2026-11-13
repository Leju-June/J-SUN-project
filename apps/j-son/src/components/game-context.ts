"use client";

import { createContext, useContext } from "react";
import type { SearchResult, SubmitResult } from "@/engine/play";
import type { GameState, Note } from "@/engine/state";
import type { View } from "@/engine/view";

export type BlankRef = { boardId: string; blankId: string };

export type Win = { id: string; x: number; y: number; w: number; h: number; z: number; min: boolean; max: boolean };

export type GameApi = {
  view: View;
  state: GameState;
  user: { displayName: string } | null;
  /** 마지막 요청이 계정에 저장됐는가. */
  saved: boolean;
  /** 서버에 닿고 있는가. */
  online: boolean;

  /** 모니터에 띄운 화면. 오른쪽 수첩은 늘 그대로 있다. */
  screen: "desktop" | "board";
  setScreen: (screen: "desktop" | "board") => void;

  /** 본문에서 누른 말을 단서 노트에 적는다. */
  addNote: (text: string, src: string, ctx: string) => void;
  removeNote: (id: string) => void;
  /** 방금 적었거나 이미 있어서 번쩍일 노트. */
  flash: { id: string; n: number } | null;
  setMemo: (memo: string) => void;
  markOpened: (id: string) => void;

  ask: (topicId: string) => void;
  search: (query: string) => Promise<SearchResult[] | null>;
  submit: (boardId: string) => Promise<SubmitResult | null>;

  setAnswer: (boardId: string, blankId: string, value: string | null) => void;
  /** 눌러서 고른 빈칸. 이 상태에서 노트를 누르면 그 칸에 들어간다. */
  activeBlank: BlankRef | null;
  setActiveBlank: (ref: BlankRef | null) => void;
  /** 노트를 집어 끌기 시작한다. 끌지 않고 떼면 누른 것으로 본다. */
  grabNote: (note: Note, event: React.PointerEvent) => void;

  wins: Win[];
  openApp: (id: string) => void;
  closeApp: (id: string) => void;
  focusApp: (id: string) => void;
  patchWin: (id: string, patch: Partial<Win>) => void;
  /** 메신저에서 보고 있는 대화 상대. */
  thread: string | null;
  setThread: (id: string) => void;

  notify: (text: string) => void;
  showEnding: () => void;
  requestReset: () => void;
};

export const GameContext = createContext<GameApi | null>(null);

export function useGame(): GameApi {
  const game = useContext(GameContext);
  if (!game) throw new Error("GameContext 밖에서 불렸습니다");
  return game;
}

export const emptyBoard = { answers: {}, solved: false, tries: 0 };
