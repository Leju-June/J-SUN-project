"use client";

import type { BoardView } from "@/engine/view";
import { emptyBoard, useGame } from "./game-context";

/**
 * 빈칸이 섞인 글. 추리판, 메일, 메신저 질문이 모두 이것으로 그린다.
 * 빈칸은 수첩의 말을 끌어다 놓거나, 칸을 누른 뒤 말을 눌러 채운다. 채운 칸을 누르면 비워진다.
 */
export function BlankText({ board }: { board: BoardView }) {
  const { state, activeBlank, setActiveBlank, setAnswer } = useGame();
  const entry = state.boards[board.id] ?? emptyBoard;

  return (
    <>
      {board.parts.map((part, i) => {
        if (part.t === "text") return <span key={i}>{part.v}</span>;
        const value = entry.answers[part.id];
        if (board.solved) {
          return (
            <span key={i} className="blank blank-solved">
              {value}
            </span>
          );
        }
        const active = activeBlank?.boardId === board.id && activeBlank.blankId === part.id;
        return (
          <button
            key={i}
            type="button"
            className={`blank${value ? " blank-filled" : ""}${active ? " blank-active" : ""}`}
            data-blank={part.id}
            data-board={board.id}
            aria-label={value ? `빈칸: ${value}. 누르면 비웁니다` : `빈칸 (${part.hint})`}
            onClick={() => {
              if (value) setAnswer(board.id, part.id, null);
              setActiveBlank(active && !value ? null : { boardId: board.id, blankId: part.id });
            }}
          >
            {value || part.hint}
          </button>
        );
      })}
    </>
  );
}

/** 빈칸을 다 채웠는가. */
export function useFilled(board: BoardView) {
  const { state } = useGame();
  const answers = state.boards[board.id]?.answers ?? {};
  return board.parts.every((part) => part.t === "text" || !!answers[part.id]);
}

export const scoreText = (correct: number, total: number) => `${total}칸 가운데 ${correct}칸이 맞았다.`;
