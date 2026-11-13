"use client";

import { useEffect, useState } from "react";
import { useGame } from "./game-context";

const playTime = (seconds: number) => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}시간 ${minutes % 60}분` : `${minutes}분`;
};

/** 글을 한 줄씩 띄운다. 움직임을 줄인 환경에서는 한꺼번에 보여 준다. */
function useReveal(count: number, ms: number) {
  const [shown, setShown] = useState(1);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setShown(count);
    if (shown >= count) return;
    const wait = setTimeout(() => setShown((n) => n + 1), ms);
    return () => clearTimeout(wait);
  }, [shown, count, ms]);
  return [shown, () => setShown(count)] as const;
}

/** 추리판을 맞혔을 때. 이어지는 이야기를 들려주고 새로 열린 것을 알린다. */
export function SolvedDialog({ boardId, onClose }: { boardId: string; onClose: () => void }) {
  const { view } = useGame();
  const board = view.boards.find((b) => b.id === boardId);
  const lines = board?.solvedLines ?? [];
  const [shown, skip] = useReveal(lines.length, 1100);
  const chapter = view.chapters.find((c) => c.id === view.current);

  useEffect(() => {
    if (!board) onClose();
  }, [board, onClose]);
  if (!board) return null;

  return (
    <div className="veil" role="dialog" aria-modal="true" aria-label="추리 확인">
      <div className="dialog dialog-wide">
        <div className="dialog-title">추리 확인 — {board.title}</div>
        <div className="dialog-body story">
          <p className="story-ok">모든 칸이 맞았다.</p>
          {lines.slice(0, shown).map((line) => (
            <p key={line} className="story-line">
              {line}
            </p>
          ))}
          {shown >= lines.length && chapter && board.chapter !== view.current && <p className="story-next">▶ {chapter.title}</p>}
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn" autoFocus onClick={shown >= lines.length ? onClose : skip}>
            {shown >= lines.length ? "계속" : "건너뛰기"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 데모의 끝. */
export function Ending({ onClose }: { onClose: () => void }) {
  const { view, state } = useGame();
  const ending = view.ending;
  const [shown, skip] = useReveal(ending?.lines.length ?? 0, 1900);
  if (!ending) return null;
  const done = shown >= ending.lines.length;
  const tries = Object.values(state.boards).reduce((sum, board) => sum + board.tries, 0);

  return (
    <div className="ending" role="dialog" aria-modal="true" aria-label={ending.title}>
      <div className="ending-inner">
        {ending.lines.slice(0, shown).map((line) => (
          <p key={line} className="ending-line">
            {line}
          </p>
        ))}
        {done && (
          <div className="ending-end">
            <h2>{ending.title}</h2>
            {ending.outro && <p>{ending.outro}</p>}
            <p className="ending-stats">
              {view.episode} · {view.title} · 플레이 {playTime(state.playSeconds)} · 제출 {tries}회 · 모은 단서 {state.notes.length}개
            </p>
            <div className="ending-actions">
              <button type="button" className="title-button" autoFocus onClick={onClose}>
                단말로 돌아가기
              </button>
              <a className="title-link" href="/">
                J-SUN 로비로
              </a>
            </div>
          </div>
        )}
        {!done && (
          <button type="button" className="title-link ending-skip" onClick={skip}>
            건너뛰기
          </button>
        )}
      </div>
    </div>
  );
}
