"use client";

import { useEffect, useState } from "react";
import type { ThemeId } from "@/lib/themes";
import { Scarf } from "./Scarf";

const SKY_WIDTH = 1600;
const SKY_HEIGHT = 900;
const STAR_COUNT = 110;
const SPARKLE_EVERY = 6;
const CLOCK_TICK_MS = 15_000;

// 서버와 브라우저에서 같은 하늘이 나오도록 고정된 순서로 뽑는다.
function createStars() {
  let seed = 20;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: STAR_COUNT }, (_, index) => ({
    x: Math.round(next() * SKY_WIDTH),
    y: Math.round(next() ** 1.6 * SKY_HEIGHT),
    size: index % SPARKLE_EVERY === 0 ? 7 + Math.round(next() * 6) : 1 + Math.round(next() * 1.5),
  }));
}

const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;

const STARS = createStars();

const clockText = () => new Date().toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });

/** 데스크톱 테마의 작업 표시줄. 장식이라 누를 수 없다. */
function Taskbar() {
  const [time, setTime] = useState(clockText);

  useEffect(() => {
    const timer = setInterval(() => setTime(clockText()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="taskbar">
      <span className="taskbar-start">시작</span>
      <span className="taskbar-task">Jeenee</span>
      <span className="taskbar-clock">{time}</span>
    </div>
  );
}

type Props = { theme: ThemeId | null; active: boolean; onOpened: () => void };

/**
 * 테마 전용 배경. 밤하늘은 별과 목도리를 그리고, 다른 테마는 fx 조각을 CSS로 꾸민다.
 * 첫 화면부터 보여야 하는 장식은 항상 그려두고 CSS로 테마마다 켠다.
 */
export function ThemeScene({ theme, active, onOpened }: Props) {
  return (
    <div className="scene" aria-hidden>
      <div className="night">
        <svg className="scene-sky" viewBox={`0 0 ${SKY_WIDTH} ${SKY_HEIGHT}`} preserveAspectRatio="xMidYMin slice">
          {STARS.map((star) =>
            star.size > 3 ? (
              <path key={`${star.x}-${star.y}`} d={sparkle(star.x, star.y, star.size)} />
            ) : (
              <circle key={`${star.x}-${star.y}`} cx={star.x} cy={star.y} r={star.size} />
            ),
          )}
        </svg>
        <div className="scene-moon" />
        <span className="meteor meteor-1" />
        <span className="meteor meteor-2" />
        <span className="meteor meteor-3" />
        <Scarf active={active} onOpened={onOpened} />
      </div>
      <span className="fx fx-1" />
      <span className="fx fx-2" />
      <span className="fx fx-3" />
      {theme === "desktop" && <Taskbar />}
    </div>
  );
}
