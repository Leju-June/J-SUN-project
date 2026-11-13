"use client";

import { useEffect, useState } from "react";
import { LIMITS } from "@/engine/state";
import { useGame } from "./game-context";

/** 모니터 옆에 늘 펼쳐져 있는 수첩. 단서 노트와 메모장을 넘겨 가며 쓴다. */
export function Notebook() {
  const { state, flash, removeNote, grabNote, setMemo, activeBlank } = useGame();
  const [tab, setTab] = useState<"notes" | "memo">("notes");
  const [memo, setLocalMemo] = useState(state.memo);

  // 새 단서를 적으면 단서 노트 쪽으로 넘긴다.
  useEffect(() => {
    if (flash) setTab("notes");
  }, [flash]);

  return (
    <aside className="notebook" aria-label="수첩">
      <div className="notebook-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "notes"} className={tab === "notes" ? "on" : ""} onClick={() => setTab("notes")}>
          단서 노트 <span className="count">{state.notes.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "memo"} className={tab === "memo" ? "on" : ""} onClick={() => setTab("memo")}>
          메모장
        </button>
      </div>

      {tab === "notes" ? (
        <div className="notebook-page" role="tabpanel">
          {state.notes.length === 0 ? (
            <div className="notebook-empty">
              <p>아직 적은 것이 없다.</p>
              <p>화면의 글에서 걸리는 말을 누르면 여기에 적힌다.</p>
              <p>적어 둔 말은 추리판의 빈칸으로 끌어다 놓는다.</p>
            </div>
          ) : (
            <>
              <p className="notebook-tip">{activeBlank ? "넣을 말을 누르세요." : "빈칸으로 끌어다 놓거나, 빈칸을 먼저 누른 뒤 고르세요."}</p>
              <ul className="notes">
                {state.notes.map((note) => (
                  <li key={flash?.id === note.id ? `${note.id}:${flash.n}` : note.id} className={`note${flash?.id === note.id ? " note-flash" : ""}`}>
                    <button type="button" className="note-grip" title={note.ctx || note.text} onPointerDown={(event) => grabNote(note, event)}>
                      <span className="note-text">{note.text}</span>
                      {note.src && <span className="note-src">{note.src}</span>}
                    </button>
                    <button type="button" className="note-del" aria-label={`${note.text} 지우기`} onClick={() => removeNote(note.id)}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        <div className="notebook-page memo-page" role="tabpanel">
          <textarea
            className="memo"
            value={memo}
            maxLength={LIMITS.memo}
            spellCheck={false}
            placeholder={"자유롭게 적는 곳.\n날짜를 나란히 적어 보거나, 의심 가는 점을 남겨 두자."}
            onChange={(event) => {
              setLocalMemo(event.target.value);
              setMemo(event.target.value);
            }}
          />
        </div>
      )}
    </aside>
  );
}
