"use client";

import { useEffect, useState } from "react";
import type { BoardView } from "@/engine/view";
import { BlankText, scoreText, useFilled } from "./Blanks";
import { emptyBoard, useGame } from "./game-context";

const FORMAT = { statement: "추리판", mail: "메일", chat: "메신저" } as const;

function Sheet({ board }: { board: BoardView }) {
  const { state, submit, view, setScreen, openApp, setThread, setAnswer } = useGame();
  const filled = useFilled(board);
  const entry = state.boards[board.id] ?? emptyBoard;
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ score: string; hint: string | null; n: number } | null>(null);

  if (board.format === "chat") {
    const who = view.threads.find((thread) => thread.id === board.thread);
    return (
      <div className="sheet sheet-chat">
        <h2>{board.title}</h2>
        <p className="sheet-text">
          <BlankText board={board} />
        </p>
        {board.solved ? (
          <p className="sheet-stamp">물어보았다</p>
        ) : (
          <div className="sheet-actions">
            <p className="sheet-note">이 질문은 메신저에서 {who?.name ?? "상대"}에게 직접 보낸다.</p>
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (who) setThread(who.id);
                setScreen("desktop");
                openApp("messenger");
              }}
            >
              메신저 열기
            </button>
          </div>
        )}
      </div>
    );
  }

  const send = async () => {
    setBusy(true);
    const result = await submit(board.id);
    setBusy(false);
    if (result && !result.solved) setFeedback({ score: scoreText(result.correct, result.total), hint: result.hint, n: Date.now() });
  };

  const body = (
    <div className="sheet-text">
      <BlankText board={board} />
    </div>
  );

  return (
    <div className={`sheet sheet-${board.format}`}>
      {board.format === "mail" && board.mail ? (
        <>
          <div className="mail-head">
            <div>
              <span>받는 사람</span>
              <strong>{board.mail.to}</strong>
            </div>
            <div>
              <span>제목</span>
              <strong>{board.mail.subject}</strong>
            </div>
          </div>
          {body}
          <p className="mail-sign">{view.playerName} 드림</p>
        </>
      ) : (
        <>
          <h2>{board.title}</h2>
          {body}
        </>
      )}

      {board.solved ? (
        <div className="sheet-solved">
          <p className="sheet-stamp">{board.format === "mail" ? "보냄" : "확인됨"}</p>
          {board.solvedLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : (
        <div className="sheet-actions">
          <button type="button" className="btn btn-main" disabled={!filled || busy} onClick={() => void send()}>
            {busy ? "확인하는 중…" : board.format === "mail" ? "보내기" : "제출"}
          </button>
          <button type="button" className="btn" disabled={busy || Object.keys(entry.answers).length === 0} onClick={() => Object.keys(entry.answers).forEach((blankId) => setAnswer(board.id, blankId, null))}>
            비우기
          </button>
          {!filled && <span className="sheet-note">빈칸을 모두 채워야 낼 수 있다.</span>}
          {feedback && filled && (
            <p key={feedback.n} className="sheet-feedback" role="status">
              <strong>{feedback.score}</strong> {feedback.hint}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** 추리판 화면. 왼쪽에서 추리판을 고르고, 오른쪽 수첩의 말을 빈칸에 끌어다 놓는다. */
export function BoardScreen() {
  const { view, state, markOpened } = useGame();
  const preferred = view.boards.find((board) => !board.solved && board.format !== "chat") ?? view.boards.find((board) => !board.solved) ?? view.boards[view.boards.length - 1];
  const [picked, setPicked] = useState<string | null>(preferred?.id ?? null);
  const board = view.boards.find((b) => b.id === picked) ?? preferred;
  const chapter = view.chapters.find((c) => c.id === view.current);

  useEffect(() => {
    if (board) markOpened(`board:${board.id}`);
  }, [board, markOpened]);

  return (
    <div className="boardscreen">
      <nav className="board-nav" aria-label="추리판 목록">
        <div className="board-goal">
          <span>지금 할 일</span>
          <p>{view.ending ? "데모를 끝까지 풀었다." : chapter?.goal}</p>
        </div>
        {view.chapters.map((c) => (
          <div key={c.id} className="board-chapter">
            <h3>{c.title}</h3>
            {c.open ? (
              <ul>
                {view.boards
                  .filter((b) => b.chapter === c.id)
                  .map((b) => (
                    <li key={b.id}>
                      <button type="button" className={`board-link${board?.id === b.id ? " on" : ""}`} onClick={() => setPicked(b.id)}>
                        <span className={`board-mark${b.solved ? " done" : ""}`}>{b.solved ? "✔" : "□"}</span>
                        <span>{b.title}</span>
                        <em>{FORMAT[b.format]}</em>
                        {!b.solved && !state.opened.includes(`board:${b.id}`) && b.format !== "chat" && <span className="fresh" aria-label="새 추리판" />}
                      </button>
                    </li>
                  ))}
                {Array.from({ length: c.lockedBoards }, (_, i) => (
                  <li key={`locked-${i}`} className="board-locked">
                    <span className="board-mark">▪</span> 아직 열리지 않음
                  </li>
                ))}
              </ul>
            ) : (
              <p className="board-locked">아직 열리지 않음</p>
            )}
          </div>
        ))}
      </nav>
      <div className="board-main">{board ? <Sheet key={board.id} board={board} /> : <p className="board-none">열린 추리판이 없다.</p>}</div>
    </div>
  );
}
