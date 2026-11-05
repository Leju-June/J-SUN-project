"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTypewriter } from "./Typewriter";

type Props = {
  scenes: string[];
  complete: boolean; // 모든 장면을 받았는가
  ending: ReactNode | null; // 마지막 장면 뒤에 보여줄 화면
  instant?: boolean; // 타이핑 없이 바로 표시
};

const SWIPE_DISTANCE = 48;

export function StoryViewer({ scenes, complete, ending, instant = false }: Props) {
  const [index, setIndex] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const touchStart = useRef<number | null>(null);

  const onEnding = index >= scenes.length;
  const text = scenes[index] ?? "";
  const typing = useTypewriter(text, instant || index < furthest);
  const { reveal, restart } = typing;

  useEffect(() => {
    if (index >= furthest) restart();
    // 장면이 바뀔 때만 타이핑을 처음부터 시작한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const canGoNext = index < scenes.length - 1 || (complete && !onEnding && ending !== null);

  const goNext = useCallback(() => {
    if (!typing.finished && !onEnding) return reveal();
    if (!canGoNext) return;
    setIndex((value) => value + 1);
    setFurthest((value) => Math.max(value, index));
  }, [typing.finished, onEnding, canGoNext, reveal, index]);

  const goBack = useCallback(() => {
    setFurthest((value) => Math.max(value, index));
    setIndex((value) => Math.max(0, value - 1));
  }, [index]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goBack]);

  const onTouchEnd = (x: number) => {
    if (touchStart.current === null) return;
    const distance = x - touchStart.current;
    touchStart.current = null;
    if (distance <= -SWIPE_DISTANCE) goNext();
    if (distance >= SWIPE_DISTANCE) goBack();
  };

  const waitingForNext = typing.finished && !onEnding && !canGoNext;

  return (
    <>
      <div
        className="box"
        onTouchStart={(event) => (touchStart.current = event.touches[0].clientX)}
        onTouchEnd={(event) => onTouchEnd(event.changedTouches[0].clientX)}
      >
        {onEnding ? (
          ending
        ) : (
          <div className="story-text" onClick={reveal} aria-live="polite">
            {typing.visible}
            {!typing.finished && <span className="cursor" aria-hidden />}
            {waitingForNext && <p className="waiting">지니가 다음 장면을 쓰고 있다...</p>}
          </div>
        )}
      </div>
      <div className="pager">
        <button type="button" className="button" onClick={goBack} disabled={index === 0}>
          ← 이전
        </button>
        <div className="dots" aria-label={`${scenes.length}개 장면 중 ${Math.min(index + 1, scenes.length)}번째`}>
          {scenes.map((_, i) => (
            <span key={i} className={i === index ? "dot active" : "dot"} />
          ))}
        </div>
        <button type="button" className="button" onClick={goNext} disabled={onEnding || (typing.finished && !canGoNext)}>
          다음 →
        </button>
      </div>
    </>
  );
}
