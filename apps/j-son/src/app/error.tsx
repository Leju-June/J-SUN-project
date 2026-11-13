"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="title">
      <h1>J-SON</h1>
      <p className="title-tag">단말에 문제가 생겼다. 진행은 저장되어 있다.</p>
      <button type="button" className="title-button" onClick={() => retry()}>
        다시 켜기
      </button>
      <a className="title-link" href="/">
        J-SUN 로비로
      </a>
    </main>
  );
}
