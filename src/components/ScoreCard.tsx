"use client";

import { useEffect, useState } from "react";

export function ScoreCard({ score, line }: { score: number; line: string }) {
  const [filled, setFilled] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setFilled(score));
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div>
      <div className="score-title">내 소원의 점수는...</div>
      <div className="score-value">{score} / 100</div>
      <div className="gauge" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="소원 점수">
        <div style={{ width: `${filled}%` }} />
      </div>
      <p>&ldquo;{line}&rdquo;</p>
    </div>
  );
}
