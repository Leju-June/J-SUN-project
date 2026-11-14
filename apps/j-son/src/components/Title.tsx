"use client";

import { useEffect, useState } from "react";
import { LIMITS } from "@/engine/state";
import { BASE_PATH } from "@/lib/base-path";
import type { CaseIntro } from "./Game";

/** 표식: J-SUN의 고리를 눈동자로 바꿨다. 들여다보는 눈(I). */
export function EyeMark({ size = 96 }: { size?: number }) {
  return (
    <svg className="eye-mark" width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <path d="M6 50 Q50 10 94 50 Q50 90 6 50 Z" fill="none" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="50" cy="50" r="15" fill="none" stroke="#fff" strokeWidth="4" />
      <circle className="eye-pupil" cx="50" cy="50" r="5.5" fill="#fff" />
    </svg>
  );
}

type TitleProps = {
  intro: CaseIntro;
  loading: boolean;
  error: string | null;
  user: { displayName: string } | null;
  resume: { name: string; chapter: string; finished: boolean } | null;
  onRetry: () => void;
  onStart: () => void;
  onResume: () => void;
  onReset: () => void;
};

export function Title({ intro, loading, error, user, resume, onRetry, onStart, onResume, onReset }: TitleProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <main className="title">
      <a className="title-back" href="/">
        ← J-SUN
      </a>
      <EyeMark />
      <h1>J-SON</h1>
      <p className="title-tag">컴퓨터로 단서를 모아, 진상을 밝힌다.</p>

      <section className="case-card" aria-label="사건">
        <div className="case-card-head">
          <span className="case-no">{intro.episode}</span>
          {intro.badge && <span className="case-badge">{intro.badge}</span>}
        </div>
        <h2>{intro.title}</h2>
        {intro.blurb.map((line) => (
          <p key={line}>{line}</p>
        ))}

        {loading ? (
          <p className="title-note">단말을 준비하는 중…</p>
        ) : error ? (
          <div className="title-actions">
            <p className="title-error">{error}</p>
            <button type="button" className="title-button" onClick={onRetry}>
              다시 시도
            </button>
          </div>
        ) : resume ? (
          <div className="title-actions">
            <p className="title-note">
              {resume.name} 형사 · {resume.finished ? "데모 완료" : resume.chapter}
            </p>
            <button type="button" className="title-button" autoFocus onClick={onResume}>
              이어서 수사
            </button>
            {confirming ? (
              <p className="title-confirm">
                진행과 단서 노트가 모두 지워집니다.{" "}
                <button type="button" className="title-link" onClick={onReset}>
                  지우고 새로 시작
                </button>{" "}
                ·{" "}
                <button type="button" className="title-link" onClick={() => setConfirming(false)}>
                  취소
                </button>
              </p>
            ) : (
              <button type="button" className="title-link" onClick={() => setConfirming(true)}>
                처음부터 다시
              </button>
            )}
          </div>
        ) : (
          <div className="title-actions">
            <button type="button" className="title-button" autoFocus onClick={onStart}>
              수사 시작
            </button>
          </div>
        )}
      </section>

      {!loading && (
        <p className="title-save">
          {user ? (
            <>{user.displayName} 님의 계정에 진행이 저장됩니다.</>
          ) : (
            <>
              로그인하지 않아도 할 수 있습니다. 진행은 이 브라우저에만 남고, <a href={`/login?next=${encodeURIComponent(BASE_PATH)}`}>로그인</a>하면 계정에 저장됩니다.
            </>
          )}
        </p>
      )}
      <p className="title-foot">PC 전용 · 데모 분량 · 자동 저장 · 시간 제한 없음</p>
    </main>
  );
}

export function NameEntry({ intro, onSubmit, onBack }: { intro: CaseIntro; onSubmit: (name: string) => void; onBack: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const cleaned = name.replace(/[\[\]{}]/g, "").trim();

  return (
    <main className="title">
      <form
        className="logon"
        onSubmit={(event) => {
          event.preventDefault();
          if (!cleaned || busy) return;
          setBusy(true);
          onSubmit(cleaned);
        }}
      >
        <div className="logon-head">{intro.station} · 수사지원 단말</div>
        <div className="logon-body">
          <p>단말을 처음 켭니다. 사용자 이름을 등록하세요.</p>
          <label>
            <span>이름</span>
            <input className="field" value={name} maxLength={LIMITS.name} autoFocus autoComplete="off" spellCheck={false} placeholder="예) 한지우" onChange={(event) => setName(event.target.value)} />
          </label>
          <p className="logon-hint">{cleaned ? `${cleaned} 형사` : "사건 기록에 이 이름으로 남습니다."}</p>
        </div>
        <div className="logon-actions">
          <button type="submit" className="btn" disabled={!cleaned || busy}>
            {busy ? "등록 중…" : "확인"}
          </button>
          <button type="button" className="btn" onClick={onBack}>
            취소
          </button>
        </div>
      </form>
    </main>
  );
}

const BOOT_LINES = ["수사지원 단말 점검 중…", "보안 모듈 확인 ......... 정상", "사건 자료실 연결 ....... 정상", "메신저 서버 연결 ....... 정상"];

/** 짧은 시동 화면. 아무 키나 누르면 건너뛴다. */
export function Boot({ station, name, onDone }: { station: string; name: string; onDone: () => void }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return void onDone();
    if (shown > BOOT_LINES.length) return void onDone();
    const wait = setTimeout(() => setShown((n) => n + 1), shown === BOOT_LINES.length ? 700 : 330);
    return () => clearTimeout(wait);
  }, [shown, onDone]);

  useEffect(() => {
    const skip = () => onDone();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [onDone]);

  return (
    <main className="boot">
      <p className="boot-head">{station}</p>
      {BOOT_LINES.slice(0, shown).map((line) => (
        <p key={line}>{line}</p>
      ))}
      {shown >= BOOT_LINES.length && <p className="boot-hello">{name} 형사, 로그인되었습니다.</p>}
    </main>
  );
}
