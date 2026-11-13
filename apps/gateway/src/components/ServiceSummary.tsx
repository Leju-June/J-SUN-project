"use client";

import { useEffect, useState } from "react";

type Summary = { loggedIn: boolean; total: number; solved: number };

/**
 * 서비스가 알려 주는 진행 현황을 카드에 붙인다. 예) "사건 1/1 해결"
 * 로그인하지 않았거나 서비스가 꺼져 있으면 아무것도 보이지 않는다.
 */
export function ServiceSummary({ url }: { url: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(url, { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<Summary>) : null))
      .then((data) => {
        if (alive && data && typeof data.total === "number" && typeof data.solved === "number") setSummary(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [url]);

  if (!summary?.loggedIn || summary.total === 0) return null;
  return (
    <span className={summary.solved > 0 ? "badge done" : "badge"}>
      사건 {summary.solved}/{summary.total} 해결
    </span>
  );
}
