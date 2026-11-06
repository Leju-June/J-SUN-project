"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { WishEvent } from "@/lib/run-wish";
import { ScoreCard } from "./ScoreCard";
import { StoryViewer } from "./StoryViewer";
import { useTypewriter } from "./Typewriter";

const INTRO = "너의 소원을 말해봐. 내가 모두 이루어줄게.";
const MAX_LENGTH = 200;
const WAITING_LINES = [
  "지니가 소원을 곱씹는 중...",
  "한 글자씩 뜯어보는 중...",
  "빈틈을 찾았다. 지니가 웃는다...",
  "램프의 연기가 이야기가 되는 중...",
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
    <div className="box">
      <p className="waiting" aria-live="polite">
        {WAITING_LINES[index]}
      </p>
    </div>
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
  const [shareState, setShareState] = useState<"idle" | "checking" | "rejected">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [replayed, setReplayed] = useState(false);
  const [mock, setMock] = useState(false);
  const [quota, setQuota] = useState<{ remaining: number; allowance: number } | null>(null);
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
    setShareState("idle");
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

  const share = async () => {
    if (!wishId) return;
    setShareState("checking");
    const response = await fetch(`/api/wishes/${wishId}/share`, { method: "POST" });
    const data = (await response.json().catch(() => null)) as { status?: string; slug?: string | null } | null;
    if (data?.status === "approved" && data.slug) {
      setShareSlug(data.slug);
      setShareState("idle");
    } else {
      setShareState("rejected");
    }
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
          {shareSlug ? (
            <Link className="button" href={`/w/${shareSlug}`}>
              공유 페이지 열기
            </Link>
          ) : (
            <button type="button" className="button" onClick={share} disabled={shareState !== "idle"}>
              {shareState === "checking" ? "검사 중..." : "공유하기"}
            </button>
          )}
        </div>
        {shareState === "rejected" && <p className="notice">실존 인물을 특정할 수 있어 공유할 수 없다.</p>}
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
    <div className="box">
      <p className="prompt-line">
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
    </div>
  );
}
