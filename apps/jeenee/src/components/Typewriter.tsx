"use client";

import { useEffect, useState } from "react";

const DEFAULT_CHARS_PER_SECOND = 40;
const TICK_MS = 50;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 도착 속도와 상관없이 일정한 속도로 글자를 드러낸다. */
export function useTypewriter(text: string, instant = false, charsPerSecond = DEFAULT_CHARS_PER_SECOND) {
  const [shown, setShown] = useState(0);
  const total = text.length;

  useEffect(() => {
    if (instant || reducedMotion()) {
      setShown(total);
      return;
    }
    if (shown >= total) return;
    const step = Math.max(1, Math.round((charsPerSecond * TICK_MS) / 1000));
    const timer = setTimeout(() => setShown((value) => Math.min(value + step, total)), TICK_MS);
    return () => clearTimeout(timer);
  }, [shown, total, instant, charsPerSecond]);

  // 바로 표시할 때는 shown 상태와 상관없이 전부 보여준다. 장면을 바꾸며 restart가 같이 불려도 비지 않게 한다.
  const end = instant ? total : shown;
  return { visible: text.slice(0, end), finished: end >= total, reveal: () => setShown(total), restart: () => setShown(0) };
}
