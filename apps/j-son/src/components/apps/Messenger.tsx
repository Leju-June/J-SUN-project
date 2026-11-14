"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { BoardView, ThreadView } from "@/engine/view";
import { BlankText, scoreText, useFilled } from "../Blanks";
import { emptyBoard, useGame } from "../game-context";
import { Rich } from "../Rich";

/** 글 길이에 맞춰 "입력 중"을 보여 주는 시간. */
const typingMs = (line: string) => Math.min(2200, 500 + line.length * 28);

type Failed = { id: number; question: string; lines: string[]; note: string };

function Draft({ board, onFailed, disabled }: { board: BoardView; onFailed: (fail: Failed) => void; disabled: boolean }) {
  const { state, submit } = useGame();
  const filled = useFilled(board);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const answers = (state.boards[board.id] ?? emptyBoard).answers;
    const question = board.parts.map((part) => (part.t === "text" ? part.v : (answers[part.id] ?? ""))).join("");
    setBusy(true);
    const result = await submit(board.id);
    setBusy(false);
    // 맞혔으면 답이 대화 기록으로 들어온다.
    if (!result || result.solved) return;
    onFailed({ id: Date.now(), question, lines: board.failLines, note: [scoreText(result.correct, result.total), result.hint].filter(Boolean).join(" ") });
  };

  return (
    <div className="chat-draft">
      <div className="chat-draft-head">직접 묻기</div>
      <p className="chat-draft-text">
        <BlankText board={board} />
      </p>
      <button type="button" className="btn" disabled={!filled || busy || disabled} onClick={() => void send()}>
        {busy ? "보내는 중…" : "보내기"}
      </button>
    </div>
  );
}

function Conversation({ thread }: { thread: ThreadView }) {
  const { view, state, ask, markOpened } = useGame();
  const src = `메신저 · ${thread.name}`;
  const mine = `메신저 · ${view.playerName}`;

  // 처음 여는 대화는 인사말부터 한 줄씩 도착한다.
  const firstTime = useRef(!state.opened.includes(thread.id));
  const [introShown, setIntroShown] = useState(firstTime.current ? 0 : thread.intro.length);
  // 방금 보낸 질문: 답이 도착하면 한 줄씩 보여 준다. 그 밖의 기록은 바로 다 보인다.
  const [pending, setPending] = useState<{ id: string; question: string; shown: number } | null>(null);
  const [fails, setFails] = useState<Failed[]>([]);
  const [failShown, setFailShown] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const known = useRef(new Set(thread.log.map((entry) => entry.id)));

  useEffect(() => markOpened(thread.id), [markOpened, thread.id]);

  // 빈칸을 채워 보낸 질문처럼 기록에 새로 생긴 대화도, 화면에 그려지기 전에 붙잡아 한 줄씩 보여 준다.
  useLayoutEffect(() => {
    for (const entry of thread.log) {
      if (known.current.has(entry.id)) continue;
      known.current.add(entry.id);
      setPending((p) => (p?.id === entry.id ? p : { id: entry.id, question: entry.question, shown: 0 }));
    }
  }, [thread.log]);

  // 틀린 질문은 대화의 맨 끝에만 잠깐 남는다. 다음 대화가 이어지면 치운다.
  useEffect(() => setFails([]), [thread.log.length]);

  const answered = pending ? thread.log.find((entry) => entry.id === pending.id) : undefined;
  const lastFail = fails[fails.length - 1];
  const failTyping = !!lastFail && failShown < lastFail.lines.length;
  const typing = introShown < thread.intro.length || (!!pending && (!answered || pending.shown < answered.lines.length)) || failTyping;

  useEffect(() => {
    if (introShown < thread.intro.length) {
      const wait = setTimeout(() => setIntroShown((n) => n + 1), typingMs(thread.intro[introShown]));
      return () => clearTimeout(wait);
    }
    if (pending && answered) {
      if (pending.shown >= answered.lines.length) return setPending(null);
      const wait = setTimeout(() => setPending((p) => p && { ...p, shown: p.shown + 1 }), typingMs(answered.lines[pending.shown]));
      return () => clearTimeout(wait);
    }
    if (lastFail && failShown < lastFail.lines.length) {
      const wait = setTimeout(() => setFailShown((n) => n + 1), typingMs(lastFail.lines[failShown]));
      return () => clearTimeout(wait);
    }
  }, [introShown, thread.intro, pending, answered, lastFail, failShown]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [introShown, pending, thread.log.length, fails.length, failShown]);

  const draft = thread.draft ? view.boards.find((board) => board.id === thread.draft) : undefined;
  const waitingTopic = pending && !answered ? pending : null;

  return (
    <div className="chat">
      <header className="chat-head">
        <strong>{thread.name}</strong>
        <span>{thread.role}</span>
      </header>

      <div className="chat-log" ref={scroller}>
        {thread.intro.slice(0, introShown).map((line, i) => (
          <p key={`intro-${i}`} className="bubble them">
            <Rich line={line} src={src} />
          </p>
        ))}
        {thread.log.map((entry) => {
          const limit = pending?.id === entry.id ? pending.shown : entry.lines.length;
          return (
            <div key={entry.id} className="exchange">
              <p className="bubble me">
                <Rich line={entry.question} src={mine} />
              </p>
              {entry.lines.slice(0, limit).map((line, i) => (
                <p key={i} className="bubble them">
                  <Rich line={line} src={src} />
                </p>
              ))}
            </div>
          );
        })}
        {waitingTopic && (
          <p className="bubble me">
            <Rich line={waitingTopic.question} src={mine} />
          </p>
        )}
        {fails.map((fail, i) => (
          <div key={fail.id} className="exchange">
            <p className="bubble me">{fail.question}</p>
            {fail.lines.slice(0, i === fails.length - 1 ? failShown : fail.lines.length).map((line, j) => (
              <p key={j} className="bubble them">
                <Rich line={line} src={src} />
              </p>
            ))}
            {(i < fails.length - 1 || !failTyping) && <p className="chat-system">{fail.note}</p>}
          </div>
        ))}
        {typing && (
          <p className="bubble them typing" aria-label={`${thread.name} 입력 중`}>
            <i />
            <i />
            <i />
          </p>
        )}
      </div>

      <div className="chat-compose">
        {draft && (
          <Draft
            board={draft}
            disabled={typing}
            onFailed={(fail) => {
              setFails((list) => [...list.slice(-2), fail]);
              setFailShown(0);
            }}
          />
        )}
        {thread.topics.length > 0 ? (
          <>
            <div className="chat-compose-head">물어볼 것</div>
            <ul className="topics">
              {thread.topics
                .filter((topic) => topic.id !== pending?.id)
                .map((topic) => (
                  <li key={topic.id}>
                    <button
                      type="button"
                      className="topic"
                      disabled={typing}
                      onClick={() => {
                        known.current.add(topic.id);
                        setFails([]);
                        setPending({ id: topic.id, question: topic.label, shown: 0 });
                        ask(topic.id);
                      }}
                    >
                      {topic.label.replace(/[\[\]]/g, "")}
                    </button>
                  </li>
                ))}
            </ul>
          </>
        ) : (
          !draft && <p className="chat-compose-empty">지금은 더 물어볼 것이 없다.</p>
        )}
      </div>
    </div>
  );
}

export function Messenger() {
  const { view, state, thread, setThread } = useGame();
  // 고른 상대가 없으면 아직 열어 보지 않은 대화, 그것도 없으면 첫 대화를 보여 준다.
  const current = view.threads.find((t) => t.id === thread) ?? view.threads.find((t) => !state.opened.includes(t.id)) ?? view.threads[0] ?? null;

  // 한번 보여 준 대화는 고른 것으로 굳힌다. 읽음 표시가 바뀌어도 상대가 바뀌지 않게.
  useEffect(() => {
    if (!thread && current) setThread(current.id);
  }, [thread, current, setThread]);

  return (
    <div className="messenger">
      <ul className="contacts" aria-label="대화 상대">
        {view.threads.map((t) => (
          <li key={t.id}>
            <button type="button" className={`contact${current?.id === t.id ? " on" : ""}`} onClick={() => setThread(t.id)}>
              <span className="avatar" aria-hidden>
                {t.name.slice(0, 1)}
              </span>
              <span className="contact-text">
                <strong>{t.name}</strong>
                <span>{t.role}</span>
              </span>
              {!state.opened.includes(t.id) && <span className="fresh" aria-label="새 대화" />}
            </button>
          </li>
        ))}
      </ul>
      {current ? <Conversation key={current.id} thread={current} /> : <div className="chat chat-none">왼쪽에서 대화 상대를 고르세요.</div>}
    </div>
  );
}
