"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BASE_PATH } from "@/lib/base-path";
import { BoardScreen } from "./BoardScreen";
import { type Win, useGame } from "./game-context";
import { Icon, type IconName } from "./Icon";
import { Archive } from "./apps/Archive";
import { Browser } from "./apps/Browser";
import { DocViewer } from "./apps/DocViewer";
import { Help } from "./apps/Help";
import { Messenger } from "./apps/Messenger";

type AppInfo = { title: string; icon: IconName };

function useAppInfo() {
  const { view } = useGame();
  return (id: string): AppInfo => {
    if (id === "messenger") return { title: "메신저", icon: "chat" };
    if (id === "browser") return { title: `${view.browser?.name ?? "인터넷"} - 인터넷`, icon: "globe" };
    if (id === "archive") return { title: "단서 보관함", icon: "box" };
    if (id === "help") return { title: "도움말", icon: "help" };
    const doc = view.documents.find((d) => `doc:${d.id}` === id);
    return { title: doc ? `${doc.filename} - 문서 보기` : "문서 보기", icon: "doc" };
  };
}

function AppBody({ id }: { id: string }) {
  if (id === "messenger") return <Messenger />;
  if (id === "browser") return <Browser />;
  if (id === "archive") return <Archive />;
  if (id === "help") return <Help />;
  return <DocViewer id={id.slice(4)} />;
}

/** 창 하나. 제목 줄을 끌어 옮기고, 오른쪽 아래 모서리로 크기를 바꾼다. */
function WindowFrame({ win, top, info, desk }: { win: Win; top: boolean; info: AppInfo; desk: React.RefObject<HTMLDivElement | null> }) {
  const { focusApp, closeApp, patchWin } = useGame();

  // 새로 뜬 창이 바탕 화면 밖으로 삐져나가지 않게 크기와 자리를 맞춘다.
  useLayoutEffect(() => {
    const area = desk.current;
    if (!area) return;
    const w = Math.min(win.w, area.clientWidth - 12);
    const h = Math.min(win.h, area.clientHeight - 12);
    const x = Math.max(0, Math.min(win.x, area.clientWidth - w - 6));
    const y = Math.max(0, Math.min(win.y, area.clientHeight - h - 6));
    if (w !== win.w || h !== win.h || x !== win.x || y !== win.y) patchWin(win.id, { w, h, x, y });
    // 처음 뜰 때 한 번만 맞춘다. 그 뒤로는 플레이어가 옮긴 대로 둔다.
  }, []);

  const track = (event: React.PointerEvent, apply: (dx: number, dy: number, bounds: { width: number; height: number }) => Partial<Win>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const bounds = { width: desk.current!.clientWidth, height: desk.current!.clientHeight };
    const move = (e: PointerEvent) => patchWin(win.id, apply(e.clientX - startX, e.clientY - startY, bounds));
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };

  const style: React.CSSProperties = win.max ? { inset: 0, zIndex: win.z } : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };

  return (
    <section className={`window${top ? " window-top" : ""}${win.max ? " window-max" : ""}`} style={{ ...style, display: win.min ? "none" : undefined }} onPointerDownCapture={() => !top && focusApp(win.id)} aria-label={info.title}>
      <header
        className="window-bar"
        onDoubleClick={() => patchWin(win.id, { max: !win.max })}
        onPointerDown={(event) => {
          if (win.max || (event.target as HTMLElement).closest("button")) return;
          track(event, (dx, dy, bounds) => ({
            // 제목 줄이 화면 밖으로 사라지지 않게 한다.
            x: Math.min(Math.max(win.x + dx, 80 - win.w), bounds.width - 80),
            y: Math.min(Math.max(win.y + dy, 0), bounds.height - 28),
          }));
        }}
      >
        <Icon name={info.icon} size={16} />
        <span className="window-title">{info.title}</span>
        <button type="button" className="window-btn" aria-label="최소화" onClick={() => patchWin(win.id, { min: true })}>
          _
        </button>
        <button type="button" className="window-btn" aria-label={win.max ? "이전 크기로" : "최대화"} onClick={() => patchWin(win.id, { max: !win.max })}>
          {win.max ? "❐" : "□"}
        </button>
        <button type="button" className="window-btn window-close" aria-label="닫기" onClick={() => closeApp(win.id)}>
          ×
        </button>
      </header>
      <div className="window-body">
        <AppBody id={win.id} />
      </div>
      {!win.max && <div className="window-grip" onPointerDown={(event) => track(event, (dx, dy) => ({ w: Math.max(360, win.w + dx), h: Math.max(260, win.h + dy) }))} />}
    </section>
  );
}

function Desktop() {
  const { view, state, wins, openApp } = useGame();
  const info = useAppInfo();
  const desk = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const topId = wins.filter((win) => !win.min).sort((a, b) => b.z - a.z)[0]?.id;

  const icons: { id: string; label: string; icon: IconName; fresh: boolean }[] = [
    ...view.documents.map((doc) => ({ id: `doc:${doc.id}`, label: doc.filename, icon: "doc" as const, fresh: !state.opened.includes(doc.id) })),
    { id: "messenger", label: "메신저", icon: "chat", fresh: view.threads.some((thread) => !state.opened.includes(thread.id)) },
    ...(view.browser ? [{ id: "browser", label: "인터넷", icon: "globe" as const, fresh: !state.opened.includes("app:browser") }] : []),
    { id: "archive", label: "단서 보관함", icon: "box", fresh: false },
    { id: "help", label: "도움말", icon: "help", fresh: false },
  ];

  return (
    <div className="desk" ref={desk} onPointerDown={(event) => event.target === event.currentTarget && setPicked(null)}>
      <div className="wallpaper" aria-hidden>
        <strong>{view.station}</strong>
        <span>수사지원 단말</span>
      </div>
      <ul className="icons">
        {icons.map((icon) => (
          <li key={icon.id}>
            <button
              type="button"
              className={`desk-icon${picked === icon.id ? " picked" : ""}`}
              onClick={() => setPicked(icon.id)}
              onDoubleClick={() => openApp(icon.id)}
              onKeyDown={(event) => event.key === "Enter" && openApp(icon.id)}
              title="두 번 눌러 열기"
            >
              <span className="desk-icon-art">
                <Icon name={icon.icon} size={36} />
                {icon.fresh && <span className="fresh" aria-label="새 항목" />}
              </span>
              <span className="desk-icon-label">{icon.label}</span>
            </button>
          </li>
        ))}
      </ul>
      {wins.map((win) => (
        <WindowFrame key={win.id} win={win} top={win.id === topId} info={info(win.id)} desk={desk} />
      ))}
    </div>
  );
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 작업 표시줄 시계에서 여는 달력. 게임 속 오늘에서 시작해 달을 넘겨 볼 수 있다. */
function Calendar({ today, onClose }: { today: string; onClose: () => void }) {
  const [y, m, d] = today.split("-").map(Number);
  const [cursor, setCursor] = useState({ year: y, month: m });
  const first = new Date(cursor.year, cursor.month - 1, 1).getDay();
  const days = new Date(cursor.year, cursor.month, 0).getDate();
  const cells = [...Array<null>(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const shift = (by: number) =>
    setCursor(({ year, month }) => {
      const next = new Date(year, month - 1 + by, 1);
      return { year: next.getFullYear(), month: next.getMonth() + 1 };
    });

  return (
    <div className="calendar" role="dialog" aria-label="달력">
      <div className="calendar-head">
        <button type="button" className="btn btn-small" aria-label="이전 달" onClick={() => shift(-1)}>
          ◀
        </button>
        <strong>
          {cursor.year}년 {cursor.month}월
        </strong>
        <button type="button" className="btn btn-small" aria-label="다음 달" onClick={() => shift(1)}>
          ▶
        </button>
      </div>
      <div className="calendar-grid">
        {WEEKDAYS.map((day, i) => (
          <span key={day} className={`calendar-day${i === 0 ? " sun" : i === 6 ? " sat" : ""}`}>
            {day}
          </span>
        ))}
        {cells.map((day, i) => (
          <span key={i} className={`calendar-cell${day && cursor.year === y && cursor.month === m && day === d ? " today" : ""}${i % 7 === 0 ? " sun" : i % 7 === 6 ? " sat" : ""}`}>
            {day ?? ""}
          </span>
        ))}
      </div>
      <div className="calendar-foot">
        <button type="button" className="btn btn-small" onClick={() => setCursor({ year: y, month: m })}>
          오늘
        </button>
        <button type="button" className="btn btn-small" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}

function Clock({ date, onClick }: { date: string; onClick: () => void }) {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setNow(new Date().toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" }));
    read();
    const tick = setInterval(read, 20_000);
    return () => clearInterval(tick);
  }, []);
  return (
    <button type="button" className="tray-clock" onClick={onClick} title="달력 열기">
      <span>{now ?? ""}</span>
      <span>{date}</span>
    </button>
  );
}

function Taskbar() {
  const { view, state, user, saved, online, screen, setScreen, wins, focusApp, patchWin, openApp, showEnding, requestReset } = useGame();
  const info = useAppInfo();
  const [menu, setMenu] = useState(false);
  const [calendar, setCalendar] = useState(false);
  const topId = wins.filter((win) => !win.min).sort((a, b) => b.z - a.z)[0]?.id;
  const chapter = view.chapters.find((c) => c.id === view.current);
  const freshBoard = view.boards.some((board) => board.format !== "chat" && !board.solved && !state.opened.includes(`board:${board.id}`));
  const saveText = !online ? "연결 끊김 · 이 브라우저에 저장" : user ? (saved ? "계정에 저장됨" : "이 브라우저에 저장") : "이 브라우저에만 저장";

  return (
    <footer className="taskbar">
      <button type="button" className={`btn start${menu ? " pressed" : ""}`} aria-expanded={menu} onClick={() => setMenu((open) => !open)}>
        <Icon name="eye" size={16} /> 시작
      </button>
      <div className="taskbar-switch" role="tablist" aria-label="화면 전환">
        <button type="button" role="tab" aria-selected={screen === "desktop"} className={`btn${screen === "desktop" ? " pressed" : ""}`} onClick={() => setScreen("desktop")}>
          데스크톱
        </button>
        <button type="button" role="tab" aria-selected={screen === "board"} className={`btn${screen === "board" ? " pressed" : ""}`} onClick={() => setScreen("board")}>
          추리판
          {freshBoard && <span className="fresh" aria-label="새 추리판" />}
        </button>
      </div>
      <div className="taskbar-wins">
        {wins.map((win) => {
          const app = info(win.id);
          const on = screen === "desktop" && win.id === topId;
          return (
            <button
              key={win.id}
              type="button"
              className={`btn task${on ? " pressed" : ""}`}
              onClick={() => {
                if (on) return patchWin(win.id, { min: true });
                setScreen("desktop");
                focusApp(win.id);
              }}
            >
              <Icon name={app.icon} size={16} />
              <span>{app.title}</span>
            </button>
          );
        })}
      </div>
      <div className="tray">
        <span className={`tray-save${!online ? " off" : ""}`} title={user ? `${user.displayName} 님으로 로그인됨` : "로그인하면 계정에 저장됩니다"}>
          {saveText}
        </span>
        <Clock date={view.date} onClick={() => setCalendar((open) => !open)} />
      </div>

      {calendar && <Calendar today={view.date} onClose={() => setCalendar(false)} />}

      {menu && (
        <>
          <div className="menu-veil" onPointerDown={() => setMenu(false)} />
          <div className="start-menu" role="menu">
            <div className="start-side">J-SON</div>
            <div className="start-items">
              <div className="start-who">
                <strong>{view.playerName} 형사</strong>
                <span>{view.station}</span>
              </div>
              {chapter && (
                <div className="start-goal">
                  <strong>{chapter.title}</strong>
                  <span>{view.ending ? "데모를 끝까지 풀었다." : chapter.goal}</span>
                </div>
              )}
              <button type="button" role="menuitem" onClick={() => (setMenu(false), openApp("help"))}>
                도움말
              </button>
              {view.ending && (
                <button type="button" role="menuitem" onClick={() => (setMenu(false), showEnding())}>
                  결말 다시 보기
                </button>
              )}
              {user ? (
                <span className="start-note">{user.displayName} 님 계정에 저장 중</span>
              ) : (
                <a role="menuitem" href={`/login?next=${encodeURIComponent(BASE_PATH)}`}>
                  로그인해서 계정에 저장
                </a>
              )}
              <button type="button" role="menuitem" onClick={() => (setMenu(false), requestReset())}>
                사건 처음부터 다시
              </button>
              <a role="menuitem" href="/">
                J-SUN 로비로 나가기
              </a>
            </div>
          </div>
        </>
      )}
    </footer>
  );
}

/** 형사의 모니터. 데스크톱과 추리판을 오가고, 아래에는 늘 작업 표시줄이 있다. */
export function Monitor() {
  const { screen } = useGame();
  return (
    <div className="monitor">
      <div className="screen">
        {/* 추리판을 보는 동안에도 창과 대화가 그대로 남도록 데스크톱은 숨기기만 한다. */}
        <div className="screen-layer" hidden={screen !== "desktop"}>
          <Desktop />
        </div>
        {screen === "board" && (
          <div className="screen-layer">
            <BoardScreen />
          </div>
        )}
        <Taskbar />
      </div>
    </div>
  );
}
