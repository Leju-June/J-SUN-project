"use client";

import { useEffect, useState } from "react";

const CHARS_PER_SECOND = 40;
const TICK_MS = 50;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 도착 속도와 상관없이 일정한 속도로 글자를 드러낸다. */
export function useTypewriter(text: string, instant = false) {
  const [shown, setShown] = useState(0);
  const total = text.length;

  useEffect(() => {
    if (instant || reducedMotion()) {
      setShown(total);
      return;
    }
    if (shown >= total) return;
    const step = Math.max(1, Math.round((CHARS_PER_SECOND * TICK_MS) / 1000));
    const timer = setTimeout(() => setShown((value) => Math.min(value + step, total)), TICK_MS);
    return () => clearTimeout(timer);
  }, [shown, total, instant]);

  return { visible: text.slice(0, shown), finished: shown >= total, reveal: () => setShown(total), restart: () => setShown(0) };
}
