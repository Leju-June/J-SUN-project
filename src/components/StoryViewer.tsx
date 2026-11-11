"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { READING_SPEEDS, charsPerSecond } from "@/lib/client-prefs";
import { Frame } from "./Frame";
import { useTypewriter } from "./Typewriter";
import { useReadingSpeed } from "./useClientState";

type Props = {
  scenes: string[];
  complete: boolean; // 모든 장면을 받았는가
  ending: ReactNode | null; // 마지막 장면 뒤에 보여줄 화면
  instant?: boolean; // 타이핑 없이 바로 표시
};

const SWIPE_DISTANCE = 48;
const FOLLOW_DISTANCE = 48;

export function StoryViewer({ scenes, complete, ending, instant = false }: Props) {
  const [index, setIndex] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const touchStart = useRef<number | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const following = useRef(true);

  const onEnding = index >= scenes.length;
  const text = scenes[index] ?? "";
  const [speed, setSpeed] = useReadingSpeed();
  const typing = useTypewriter(text, instant || index < furthest, charsPerSecond(speed));
  const { restart } = typing;

  // 타이핑을 건너뛰면 읽던 위치를 유지한다.
  const reveal = useCallback(() => {
    following.current = false;
    typing.reveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (index >= furthest) restart();
    // 장면이 바뀔 때만 타이핑을 처음부터 시작한다.
    following.current = true;
    body.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // 글이 상자를 넘으면 따라 내려가되, 사용자가 위로 올려 읽는 중이면 멈춘다.
  useEffect(() => {
    const element = body.current;
    if (element && following.current) element.scrollTop = element.scrollHeight;
  }, [typing.visible]);

  const onScroll = () => {
    const element = body.current;
    if (element) following.current = element.scrollHeight - element.scrollTop - element.clientHeight < FOLLOW_DISTANCE;
  };

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

  // 이미 읽은 장면은 점을 눌러 바로 오갈 수 있다.
  const reached = instant ? scenes.length : Math.max(furthest, index);
  const jump = (target: number) => {
    setFurthest((value) => Math.max(value, index));
    setIndex(target);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === "ArrowRight") goNext();
      else if (event.key === "ArrowLeft") goBack();
      // 버튼이나 링크에 초점이 있으면 Space와 Enter는 그 버튼의 몫이다.
      else if ((event.key === " " || event.key === "Enter") && !target?.closest("button, a")) {
        event.preventDefault();
        goNext();
      }
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
      <Frame
        title={onEnding ? "결과" : complete ? `장면 ${index + 1} / ${scenes.length}` : `장면 ${index + 1}`}
        bodyRef={body}
        onScroll={onScroll}
        onTouchStart={(event) => (touchStart.current = event.touches[0].clientX)}
        onTouchEnd={(event) => onTouchEnd(event.changedTouches[0].clientX)}
      >
        {onEnding ? (
          ending
        ) : (
          <div className="story-text" onClick={reveal} aria-live="polite" data-typed>
            {typing.visible}
            {!typing.finished && <span className="cursor" aria-hidden />}
            {waitingForNext && <p className="waiting">지니가 다음 장면을 쓰고 있다...</p>}
          </div>
        )}
      </Frame>
      <div className="pager">
        <button type="button" className="button" onClick={goBack} disabled={index === 0}>
          ← 이전
        </button>
        <div className="dots" role="group" aria-label={`${scenes.length}개 장면 중 ${Math.min(index + 1, scenes.length)}번째`}>
          {scenes.map((_, i) => (
            <button
              key={i}
              type="button"
              className={i === index ? "dot active" : "dot"}
              aria-label={`장면 ${i + 1}`}
              aria-current={i === index ? "step" : undefined}
              disabled={i > reached}
              onClick={() => jump(i)}
            />
          ))}
        </div>
        <button type="button" className="button" onClick={goNext} disabled={onEnding || (typing.finished && !canGoNext)}>
          다음 →
        </button>
      </div>
      <div className="reader-tools">
        <span className="key-hint">← → 또는 Space로 넘기기</span>
        {!instant && (
          <div className="speed" role="group" aria-label="글자 속도">
            <span>글자 속도</span>
            {READING_SPEEDS.map((option) => (
              <button
                key={option.id}
                type="button"
                className="link-button speed-option"
                aria-pressed={speed === option.id}
                onClick={() => setSpeed(option.id)}
              >
                {option.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
