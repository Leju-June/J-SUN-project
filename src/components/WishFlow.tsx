"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { WishEvent } from "@/lib/run-wish";
import { Frame } from "./Frame";
import { ScoreCard } from "./ScoreCard";
import { ShareActions } from "./ShareActions";
import { StoryViewer } from "./StoryViewer";
import { useTypewriter } from "./Typewriter";
import { notifyChanged } from "./useLiveData";

const INTRO = "너의 소원을 말해봐. 내가 모두 이루어줄게.";
const MAX_LENGTH = 200;
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

function WaitingBox() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => Math.min(current + 1, WAITING_LINES.length - 1)), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Frame title="지니의 램프">
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
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (wish.length < 2) return;

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

  const reset = () => {
    setText("");
    setMessage(null);
    setStage("ask");
    intro.restart();
    refreshQuota();
  };

  if (stage === "waiting") return <WaitingBox />;

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
            <input
              id="wish"
              ref={inputRef}
              className="wish-input"
              value={text}
              maxLength={MAX_LENGTH}
              autoComplete="off"
              placeholder={`예: ${example}`}
              disabled={noneLeft}
              onChange={(event) => setText(event.target.value)}
            />
          </div>
          <div className="wish-meta">
            <span>
              {noneLeft
                ? "이번 주 소원을 모두 썼다. 램프는 월요일에 다시 깨어난다."
                : quota && `이번 주 남은 소원 ${quota.remaining}개`}
              {!noneLeft && ` · ${text.length} / ${MAX_LENGTH}`}
            </span>
            <button type="submit" className="button" disabled={noneLeft || text.trim().length < 2}>
              빌기
            </button>
          </div>
        </form>
      )}
      {message && <p className="notice">{message}</p>}
      {intro.finished && (
        <p className="notice">
          처음이라면 <Link href="/rules">지니의 규칙</Link>부터 읽어봐.
        </p>
      )}
    </Frame>
  );
}
