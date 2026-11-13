"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlayAction, PlayResponse } from "@/engine/play";
import { type GameState, LIMITS, type Note, newState } from "@/engine/state";
import type { View } from "@/engine/view";
import { withBase } from "@/lib/base-path";
import { clearLocal, readLocal, writeLocal } from "@/lib/local";
import { Ending, SolvedDialog } from "./Dialogs";
import { type BlankRef, type GameApi, GameContext, type Win, emptyBoard } from "./game-context";
import { Monitor } from "./Monitor";
import { Notebook } from "./Notebook";
import { Boot, NameEntry, Title } from "./Title";

export type CaseIntro = { id: string; title: string; episode: string; badge: string | null; station: string; blurb: string[] };

type Phase = "loading" | "title" | "name" | "boot" | "play";
type Urgency = "now" | "soon" | "lazy";

const WIN_SIZE: Record<string, { w: number; h: number }> = {
  messenger: { w: 660, h: 540 },
  browser: { w: 700, h: 540 },
  archive: { w: 520, h: 470 },
  help: { w: 470, h: 440 },
  doc: { w: 540, h: 500 },
};

export function Game({ intro }: { intro: CaseIntro }) {
  const caseId = intro.id;
  const [phase, setPhase] = useState<Phase>("loading");
  const [state, setState] = useState<GameState | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [user, setUser] = useState<GameApi["user"]>(null);
  const [saved, setSaved] = useState(false);
  const [online, setOnline] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [screen, setScreen] = useState<"desktop" | "board">("desktop");
  const [activeBlank, setActiveBlank] = useState<BlankRef | null>(null);
  const [drag, setDrag] = useState<{ text: string; x: number; y: number } | null>(null);
  const [flash, setFlash] = useState<GameApi["flash"]>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [wins, setWins] = useState<Win[]>([]);
  const [thread, setThread] = useState<string | null>(null);
  const [solvedBoard, setSolvedBoard] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const stateRef = useRef<GameState | null>(null);
  const viewRef = useRef<View | null>(null);
  const activeRef = useRef<BlankRef | null>(null);
  const seq = useRef(0);
  const applied = useRef(0);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);
  const topZ = useRef(10);

  activeRef.current = activeBlank;

  const notify = useCallback((text: string) => {
    const id = ++counter.current;
    setToasts((list) => [...list.slice(-3), { id, text }]);
    setTimeout(() => setToasts((list) => list.filter((toast) => toast.id !== id)), 9000);
  }, []);

  /** 서버에 상태를 통째로 보내고 지금 열린 화면을 받는다. 늦게 온 옛 응답은 버린다. */
  const call = useCallback(
    async (action: PlayAction, stateOverride?: unknown, keepalive = false): Promise<PlayResponse> => {
      const mine = ++seq.current;
      const response = await fetch(withBase("/api/play"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, state: stateOverride === undefined ? stateRef.current : stateOverride, action }),
        keepalive,
      });
      const data = (await response.json().catch(() => null)) as (PlayResponse & { error?: string }) | null;
      if (!response.ok || !data) throw new Error(data?.error ?? "서버와 연결하지 못했습니다.");
      if (data.view && mine > applied.current) {
        applied.current = mine;
        viewRef.current = data.view;
        setView(data.view);
      }
      setUser(data.user);
      setSaved(data.saved);
      return data;
    },
    [caseId],
  );

  const sync = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!stateRef.current) return;
    dirty.current = false;
    try {
      await call({ type: "sync" });
      setOnline(true);
    } catch {
      dirty.current = true;
      setOnline(false);
    }
  }, [call]);

  /** 상태를 바꾸고 브라우저에 적는다. 서버에는 급한 정도에 따라 알린다. */
  const commit = useCallback(
    (recipe: (current: GameState) => GameState, urgency: Urgency = "soon") => {
      const current = stateRef.current;
      if (!current) return;
      const changed = recipe(current);
      if (changed === current) return;
      const next = { ...changed, updatedAt: Date.now() };
      stateRef.current = next;
      setState(next);
      writeLocal(caseId, next);
      dirty.current = true;
      if (urgency === "now") void sync();
      else if (urgency === "soon") {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void sync(), 1200);
      }
    },
    [caseId, sync],
  );

  // 처음 들어올 때: 브라우저에 남은 진행을 보내고, 계정에 더 새로운 것이 있으면 그것을 받는다.
  const load = useCallback(async () => {
    setLoadError(null);
    setPhase("loading");
    try {
      const data = await call({ type: "load" }, readLocal(caseId));
      stateRef.current = data.state;
      setState(data.state);
      if (data.state) writeLocal(caseId, data.state);
      setPhase("title");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "서버와 연결하지 못했습니다.");
      setPhase("title");
    }
  }, [call, caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  // 플레이 시간과 밀린 저장.
  useEffect(() => {
    if (phase !== "play") return;
    const tick = setInterval(() => {
      if (document.visibilityState === "visible" && !viewRef.current?.ending) commit((s) => ({ ...s, playSeconds: s.playSeconds + 15 }), "lazy");
    }, 15_000);
    const flush = setInterval(() => {
      if (dirty.current) void sync();
    }, 20_000);
    const leave = () => {
      if (dirty.current && stateRef.current) {
        dirty.current = false;
        void call({ type: "sync" }, undefined, true).catch(() => {});
      }
    };
    window.addEventListener("pagehide", leave);
    return () => {
      clearInterval(tick);
      clearInterval(flush);
      window.removeEventListener("pagehide", leave);
    };
  }, [phase, commit, sync, call]);

  // 새로 열린 것을 알린다.
  const previous = useRef<View | null>(null);
  useEffect(() => {
    const before = previous.current;
    previous.current = view;
    if (!before || !view || phase !== "play") return;
    for (const t of view.threads) {
      const old = before.threads.find((o) => o.id === t.id);
      if (!old) notify(`메신저에 새 대화 상대가 등록됐습니다: ${t.name}`);
      else if (t.topics.some((topic) => !old.topics.some((o) => o.id === topic.id) && !old.log.some((o) => o.id === topic.id)) && old.log.length > 0 && t.log.length === old.log.length) notify(`${t.name}에게 새로 물어볼 것이 생겼습니다.`);
    }
    if (!before.browser && view.browser) notify(`인터넷 검색(${view.browser.name})을 쓸 수 있습니다.`);
    for (const board of view.boards) if (!before.boards.some((o) => o.id === board.id)) notify(board.format === "chat" ? `메신저에서 빈칸을 채워 물어볼 수 있습니다: ${board.title}` : `새 추리판이 열렸습니다: ${board.title}`);
  }, [view, phase, notify]);

  /* ───── 단서 노트 ───── */

  const addNote = useCallback(
    (text: string, src: string, ctx: string) => {
      const current = stateRef.current;
      if (!current) return;
      const word = text.trim().slice(0, LIMITS.noteText);
      if (!word) return;
      const existing = current.notes.find((note) => note.text === word);
      if (existing) return setFlash({ id: existing.id, n: ++counter.current });
      if (current.notes.length >= LIMITS.notes) return notify("단서 노트가 가득 찼습니다. 쓰지 않는 말을 지워 주세요.");
      const note: Note = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, text: word, src: src.slice(0, LIMITS.noteSrc), ctx: ctx.slice(0, LIMITS.noteCtx), at: Date.now() };
      commit((s) => ({ ...s, notes: [note, ...s.notes] }));
      setFlash({ id: note.id, n: ++counter.current });
    },
    [commit, notify],
  );

  const removeNote = useCallback((id: string) => commit((s) => ({ ...s, notes: s.notes.filter((note) => note.id !== id) })), [commit]);
  const setMemo = useCallback((memo: string) => commit((s) => ({ ...s, memo: memo.slice(0, LIMITS.memo) })), [commit]);
  const markOpened = useCallback((id: string) => commit((s) => (s.opened.includes(id) ? s : { ...s, opened: [...s.opened, id] }), "lazy"), [commit]);

  /* ───── 묻기 · 검색 · 제출 ───── */

  const ask = useCallback((topicId: string) => commit((s) => (s.asked.includes(topicId) ? s : { ...s, asked: [...s.asked, topicId] }), "now"), [commit]);

  const search = useCallback(
    async (query: string) => {
      try {
        const data = await call({ type: "search", query });
        setOnline(true);
        const done = data.search?.query;
        if (done) commit((s) => ({ ...s, searches: [...s.searches.filter((q) => q !== done), done] }), "lazy");
        return data.search?.results ?? [];
      } catch {
        setOnline(false);
        return null;
      }
    },
    [call, commit],
  );

  const submit = useCallback(
    async (boardId: string) => {
      const current = stateRef.current;
      if (!current) return null;
      try {
        const data = await call({ type: "submit", boardId, answers: current.boards[boardId]?.answers ?? {} });
        setOnline(true);
        const result = data.submit;
        if (!result) return null;
        commit((s) => ({ ...s, boards: { ...s.boards, [boardId]: result.board }, asked: result.log && !s.asked.includes(result.log) ? [...s.asked, result.log] : s.asked }), "lazy");
        if (result.solved) {
          setActiveBlank(null);
          const board = data.view?.boards.find((b) => b.id === boardId);
          if (data.view?.ending) setEnding(true);
          else if (board && board.format !== "chat") setSolvedBoard(boardId);
        }
        return result;
      } catch (error) {
        setOnline(false);
        notify(error instanceof Error ? error.message : "제출하지 못했습니다.");
        return null;
      }
    },
    [call, commit, notify],
  );

  const setAnswer = useCallback(
    (boardId: string, blankId: string, value: string | null) =>
      commit((s) => {
        const entry = s.boards[boardId] ?? emptyBoard;
        if (entry.solved || (entry.answers[blankId] ?? null) === value) return s;
        const answers = { ...entry.answers };
        if (value === null) delete answers[blankId];
        else answers[blankId] = value;
        return { ...s, boards: { ...s.boards, [boardId]: { ...entry, answers } } };
      }),
    [commit],
  );

  /** 고른 빈칸에 넣고, 같은 추리판의 다음 빈 칸으로 넘어간다. */
  const fillActive = useCallback(
    (text: string) => {
      const active = activeRef.current;
      if (!active) return false;
      setAnswer(active.boardId, active.blankId, text);
      const board = viewRef.current?.boards.find((b) => b.id === active.boardId);
      const answers = { ...(stateRef.current?.boards[active.boardId]?.answers ?? {}), [active.blankId]: text };
      const next = board?.parts.find((part) => part.t === "blank" && !answers[part.id]);
      setActiveBlank(next && next.t === "blank" ? { boardId: active.boardId, blankId: next.id } : null);
      return true;
    },
    [setAnswer],
  );

  const grabNote = useCallback(
    (note: Note, event: React.PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      let moved = false;
      let over: Element | null = null;
      const slotAt = (x: number, y: number) => document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-blank]") ?? null;
      const move = (e: PointerEvent) => {
        if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) < 5) return;
        moved = true;
        setDrag({ text: note.text, x: e.clientX, y: e.clientY });
        const slot = slotAt(e.clientX, e.clientY);
        if (slot !== over) {
          over?.classList.remove("blank-over");
          slot?.classList.add("blank-over");
          over = slot;
        }
      };
      const finish = (e: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
        over?.classList.remove("blank-over");
        setDrag(null);
        if (e.type === "pointercancel") return;
        if (moved) {
          const slot = slotAt(e.clientX, e.clientY);
          if (slot?.dataset.board && slot.dataset.blank) {
            setAnswer(slot.dataset.board, slot.dataset.blank, note.text);
            setActiveBlank(null);
          }
        } else if (!fillActive(note.text)) setFlash({ id: note.id, n: ++counter.current });
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
    },
    [setAnswer, fillActive],
  );

  /* ───── 창 ───── */

  const focusApp = useCallback((id: string) => setWins((list) => list.map((win) => (win.id === id ? { ...win, z: ++topZ.current, min: false } : win))), []);
  const openApp = useCallback((id: string) => {
    setScreen("desktop");
    setWins((list) => {
      if (list.some((win) => win.id === id)) return list.map((win) => (win.id === id ? { ...win, z: ++topZ.current, min: false } : win));
      const size = WIN_SIZE[id.split(":")[0]] ?? WIN_SIZE.doc;
      const offset = (list.length % 6) * 26;
      return [...list, { id, x: 150 + offset, y: 24 + offset, ...size, z: ++topZ.current, min: false, max: false }];
    });
  }, []);
  const closeApp = useCallback((id: string) => setWins((list) => list.filter((win) => win.id !== id)), []);
  const patchWin = useCallback((id: string, patch: Partial<Win>) => setWins((list) => list.map((win) => (win.id === id ? { ...win, ...patch } : win))), []);

  /* ───── 시작 · 초기화 ───── */

  const enter = useCallback(
    (fresh: boolean) => {
      setScreen("desktop");
      setWins([]);
      setThread(null);
      setPhase("boot");
      // 처음 켰을 때는 배당서를 띄워 둔다.
      if (fresh) setTimeout(() => openApp(`doc:${viewRef.current?.documents[0]?.id ?? ""}`), 0);
    },
    [openApp],
  );

  const begin = useCallback(
    async (name: string) => {
      const fresh = newState(caseId, name);
      stateRef.current = fresh;
      setState(fresh);
      writeLocal(caseId, fresh);
      try {
        await call({ type: "sync" });
        setOnline(true);
        enter(true);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "서버와 연결하지 못했습니다.");
        setPhase("title");
      }
    },
    [call, caseId, enter],
  );

  const reset = useCallback(async () => {
    setConfirmReset(false);
    clearLocal(caseId);
    stateRef.current = null;
    viewRef.current = null;
    previous.current = null;
    setState(null);
    setView(null);
    setEnding(false);
    setSolvedBoard(null);
    setPhase("title");
    try {
      await call({ type: "reset" }, null);
    } catch {
      setOnline(false);
    }
  }, [call, caseId]);

  const api = useMemo<GameApi | null>(
    () =>
      state && view
        ? {
            view,
            state,
            user,
            saved,
            online,
            screen,
            setScreen,
            addNote,
            removeNote,
            flash,
            setMemo,
            markOpened,
            ask,
            search,
            submit,
            setAnswer,
            activeBlank,
            setActiveBlank,
            grabNote,
            wins,
            openApp,
            closeApp,
            focusApp,
            patchWin,
            thread,
            setThread,
            notify,
            showEnding: () => setEnding(true),
            requestReset: () => setConfirmReset(true),
          }
        : null,
    [state, view, user, saved, online, screen, addNote, removeNote, flash, setMemo, markOpened, ask, search, submit, setAnswer, activeBlank, grabNote, wins, openApp, closeApp, focusApp, patchWin, thread, notify],
  );

  const small = (
    <div className="too-small">
      <strong>J-SON</strong>
      <p>이 게임은 PC 화면에서만 플레이할 수 있습니다.</p>
      <p>창을 넓히거나 컴퓨터에서 다시 접속해 주세요.</p>
      <a href="/">J-SUN 로비로</a>
    </div>
  );

  if (phase === "play" && api) {
    return (
      <GameContext.Provider value={api}>
        {small}
        <div className={`stage${drag ? " is-dragging" : ""}${activeBlank ? " has-active-blank" : ""}`}>
          <Monitor />
          <Notebook />
        </div>
        <div className="toasts" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className="toast">
              {toast.text}
            </div>
          ))}
        </div>
        {drag && (
          <div className="drag-ghost" style={{ left: drag.x, top: drag.y }}>
            {drag.text}
          </div>
        )}
        {solvedBoard && !ending && <SolvedDialog boardId={solvedBoard} onClose={() => setSolvedBoard(null)} />}
        {ending && <Ending onClose={() => setEnding(false)} />}
        {confirmReset && (
          <div className="veil" role="dialog" aria-modal="true" aria-label="사건 초기화">
            <div className="dialog">
              <div className="dialog-title">사건 초기화</div>
              <div className="dialog-body">
                <p>지금까지의 진행과 단서 노트, 메모가 모두 지워집니다.</p>
                <p>처음부터 다시 시작할까요?</p>
              </div>
              <div className="dialog-actions">
                <button type="button" className="btn" onClick={() => void reset()}>
                  지우고 다시 시작
                </button>
                <button type="button" className="btn" autoFocus onClick={() => setConfirmReset(false)}>
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </GameContext.Provider>
    );
  }

  return (
    <>
      {small}
      {phase === "boot" && view ? (
        <Boot station={view.station} name={view.playerName} onDone={() => setPhase("play")} />
      ) : phase === "name" ? (
        <NameEntry intro={intro} onSubmit={(name) => void begin(name)} onBack={() => setPhase("title")} />
      ) : (
        <Title
          intro={intro}
          loading={phase === "loading"}
          error={loadError}
          user={user}
          resume={state && view ? { name: view.playerName, chapter: view.chapters.find((c) => c.id === view.current)?.title ?? "", finished: !!view.ending } : null}
          onRetry={() => void load()}
          onStart={() => setPhase("name")}
          onResume={() => enter(false)}
          onReset={() => void reset()}
        />
      )}
    </>
  );
}
