"use client";

import { useEffect, useState } from "react";

// 테마가 점수대에 따라 다른 연출을 붙일 수 있도록 구간을 노출한다. genieLine의 구간과 같다.
const tierOf = (score: number) => (score >= 90 ? "high" : score >= 70 ? "good" : score >= 40 ? "mid" : "low");

export function ScoreCard({ score, line }: { score: number; line: string }) {
  const [filled, setFilled] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setFilled(score));
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className="score-card" data-tier={tierOf(score)}>
      <div className="score-title">내 소원의 점수는...</div>
      <div className="score-value">{score} / 100</div>
      <div className="gauge" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="소원 점수">
        <div style={{ width: `${filled}%` }} />
      </div>
      <p className="score-line">&ldquo;{line}&rdquo;</p>
    </div>
  );
}
