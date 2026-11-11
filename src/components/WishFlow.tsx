"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { daysUntilResetKst, readStored, writeStored } from "@/lib/client-prefs";
import type { WishEvent } from "@/lib/run-wish";
import { Frame } from "./Frame";
import { ScoreCard } from "./ScoreCard";
import { ShareActions } from "./ShareActions";
import { StoryViewer } from "./StoryViewer";
import { useTypewriter } from "./Typewriter";
import { useOnline } from "./useClientState";
import { notifyChanged } from "./useLiveData";

const INTRO = "너의 소원을 말해봐. 내가 모두 이루어줄게.";
const MAX_LENGTH = 200;
const NEAR_LIMIT = 180;
const DRAFT_KEY = "jeenee-draft";
const WAITING_LINES = [
  "지니가 소원을 곱씹는 중...",
  "한 글자씩 뜯어보는 중...",
  "빈틈을 찾았다. 지니가 웃는다...",
  "램프의 연기가 이야기가 되는 중...",
];

// 처음 온 사람이 어떤 식으로 빌면 되는지 감을 잡도록 입력란에 하나씩 보여준다.
const EXAMPLES = [
  "내일 아침 눈을 뜨면 세금을 다 낸 10억 원이 내 통장에 있게 해줘",
  "우리 집 고양이가 사람 말을 하게 해줘",
  "아무도 다치지 않고 하늘을 날 수 있게 해줘",
  "평생 아무리 먹어도 살이 찌지 않게 해줘",
  "다음 주 시험 범위를 전부 완벽하게 기억하게 해줘",
];

const STOP_MESSAGES: Record<string, string> = {
  busy: "그 소원은 이미 듣고 있다. 잠시 후 다시 빌어봐.",
  limit: "이번 주 소원을 모두 썼다. 램프는 월요일에 다시 깨어난다.",
  closed: "오늘은 램프가 지쳤다. 내일 다시 찾아와.",
  refused: "…그 소원은 내 힘이 닿지 않는다. 소원은 차감되지 않았어.",
  error: "램프에 문제가 생겼다. 소원은 차감되지 않았어.",
};

type Result = { score: number; line: string; achievements: { code: string; title: string }[] };
type Stage = "ask" | "waiting" | "story";

const usedUpMessage = () => {
  const days = daysUntilResetKst();
  return `이번 주 소원을 모두 썼다. 램프는 ${days === 1 ? "내일" : `${days}일 뒤`} 월요일에 다시 깨어난다.`;
};

function WaitingBox({ wish }: { wish: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => Math.min(current + 1, WAITING_LINES.length - 1)), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Frame title="지니의 램프">
      <p className="wish-echo">
        <span>내 소원은...</span> {wish}
      </p>
      <p className="waiting" aria-live="polite">
        {WAITING_LINES[index]}
      </p>
    </Frame>
  );
}

export function WishFlow() {
  const [stage, setStage] = useState<Stage>("ask");
  const [text, setText] = useState("");
  const [scenes, setScenes] = useState<string[]>([]);
  const [complete, setComplete] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [wishId, setWishId] = useState<string | null>(null);
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [replayed, setReplayed] = useState(false);
  const [mock, setMock] = useState(false);
  const [quota, setQuota] = useState<{ remaining: number; allowance: number } | null>(null);
  const [example] = useState(() => EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const online = useOnline();

  const intro = useTypewriter(stage === "ask" ? INTRO : "", false);

  const refreshQuota = () =>
    fetch("/api/quota")
      .then((response) => response.json())
      .then(setQuota)
      .catch(() => setQuota(null));

  useEffect(() => {
    refreshQuota();
  }, []);

  useEffect(() => {
    if (stage === "ask" && intro.finished) inputRef.current?.focus();
  }, [stage, intro.finished]);

  // 새로고침하거나 실수로 닫아도 쓰던 소원이 남아 있게 한다.
  useEffect(() => {
    const draft = readStored("session", DRAFT_KEY);
    if (draft) setText(draft.slice(0, MAX_LENGTH));
  }, []);

  const changeText = (value: string) => {
    const next = value.replace(/[\r\n]+/g, " ");
    setText(next);
    writeStored("session", DRAFT_KEY, next || null);
  };

  // 입력란 높이를 내용에 맞춘다. 한 줄에서 시작해 CSS의 max-height까지 늘어난다.
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight + 1}px`;
  }, [text, stage, intro.finished]);

  // 이야기를 받는 중에 창을 닫으려 하면 한 번 되묻는다.
  const receiving = stage === "waiting" || (stage === "story" && !complete);
  useEffect(() => {
    if (!receiving) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [receiving]);

  const handleEvent = (event: WishEvent) => {
    switch (event.type) {
      case "start":
        setWishId(event.id);
        setMock(event.mock);
        setQuota((current) => (current ? { ...current, remaining: event.remaining } : current));
        break;
      case "delta":
        setStage("story");
        setScenes((current) => {
          const next = [...current];
          next[event.scene] = (next[event.scene] ?? "") + event.text;
          return next;
        });
        break;
      case "done":
        setComplete(true);
        setResult({ score: event.score, line: event.line, achievements: event.achievements });
        notifyChanged();
        break;
      case "duplicate":
        setWishId(event.id);
        setShareSlug(event.shareSlug);
        setReplayed(true);
        setScenes(event.scenes);
        setComplete(true);
        setResult({ score: event.score, line: event.line, achievements: [] });
        setStage("story");
        break;
      case "stopped":
        setMessage(STOP_MESSAGES[event.reason]);
        setStage("ask");
        refreshQuota();
        break;
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const wish = text.trim();
    if (wish.length < 2 || !online) return;

    setMessage(null);
    setScenes([]);
    setComplete(false);
    setResult(null);
    setWishId(null);
    setShareSlug(null);
    setReplayed(false);
    setStage("waiting");

    try {
      const response = await fetch("/api/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: wish }),
      });
      if (!response.ok || !response.body) throw new Error("request failed");

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) if (line) handleEvent(JSON.parse(line) as WishEvent);
      }
    } catch {
      setMessage(STOP_MESSAGES.error);
      setStage("ask");
    }
  };

  // 줄바꿈 대신 바로 빈다. 한글을 조합하는 중의 Enter는 글자 확정이므로 넘긴다.
  const onInputKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  const reset = () => {
    changeText("");
    setMessage(null);
    setStage("ask");
    intro.restart();
    refreshQuota();
  };

  if (stage === "waiting") return <WaitingBox wish={text.trim()} />;

  if (stage === "story") {
    const ending = result && (
      <div>
        {replayed && <p className="notice">이미 빈 소원이다. 그때의 결과를 다시 보여주지.</p>}
        <ScoreCard score={result.score} line={result.line} />
        {result.achievements.length > 0 && (
          <div className="chips">
            {result.achievements.map((achievement) => (
              <span key={achievement.code} className="chip">
                업적 {achievement.title}
              </span>
            ))}
          </div>
        )}
        <div className="actions">
          <button type="button" className="button" onClick={reset}>
            새 소원 빌기
          </button>
          <ShareActions key={wishId} wishId={wishId} slug={shareSlug} />
        </div>
      </div>
    );

    return (
      <>
        <StoryViewer scenes={scenes} complete={complete} ending={ending} instant={replayed} />
        {mock && <p className="notice">샘플 모드: API 키가 없어 실제 AI 대신 샘플 스토리를 보여줍니다.</p>}
      </>
    );
  }

  const noneLeft = quota?.remaining === 0;

  return (
    <Frame title="지니의 램프">
      <p className="prompt-line" data-typed>
        {intro.visible}
        {!intro.finished && <span className="cursor" aria-hidden />}
      </p>
      {intro.finished && (
        <form className="wish-form" onSubmit={submit}>
          <div className="wish-row">
            <label htmlFor="wish">내 소원은...</label>
            <textarea
              id="wish"
              ref={inputRef}
              className="wish-input"
              rows={1}
              value={text}
              maxLength={MAX_LENGTH}
              autoComplete="off"
              placeholder={`예: ${example}`}
              enterKeyHint="send"
              disabled={noneLeft}
              onChange={(event) => changeText(event.target.value)}
              onKeyDown={onInputKey}
            />
          </div>
          <div className="wish-meta">
            <span>
              {noneLeft ? usedUpMessage() : quota && `이번 주 남은 소원 ${quota.remaining}개 · `}
              {!noneLeft && (
                <span className={text.length >= NEAR_LIMIT ? "wish-count near-limit" : "wish-count"}>
                  {text.length} / {MAX_LENGTH}
                </span>
              )}
            </span>
            <button type="submit" className="button" disabled={noneLeft || !online || text.trim().length < 2}>
              빌기
            </button>
          </div>
        </form>
      )}
      {message && <p className="notice">{message}</p>}
      {!online && (
        <p className="notice" role="status">
          연결이 끊겼다. 램프가 네 목소리를 듣지 못한다. 쓰던 소원은 그대로 둘게.
        </p>
      )}
      {intro.finished && (
        <p className="notice">
          처음이라면 <Link href="/rules">지니의 규칙</Link>부터 읽어봐.
        </p>
      )}
    </Frame>
  );
}
