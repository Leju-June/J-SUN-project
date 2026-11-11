"use client";

import Link from "next/link";
import { Frame } from "./Frame";
import { useLiveResource } from "./useLiveData";

type Shared = { items: { slug: string; text: string; score: number }[] };

export function SharedPanel() {
  const { data: shared, failed, reload } = useLiveResource<Shared>("/api/shared");

  return (
    <Frame title="공유된 이야기" className="fill">
      <p className="panel-line">
        <Link href="/hall" className="panel-link">
          이번 주의 소원
        </Link>
      </p>
      {!shared && !failed && <p className="notice">불러오는 중...</p>}
      {failed && (
        <p className="notice">
          {shared ? "새 이야기를 불러오지 못했다. " : "이야기를 불러오지 못했다. "}
          <button type="button" className="link-button panel-link" onClick={reload}>
            다시 시도
          </button>
        </p>
      )}
      {shared?.items.length === 0 && <p className="notice">아직 공유된 소원이 없다.</p>}
      <ul className="panel-list shared-list">
        {shared?.items.map((item) => (
          <li key={item.slug}>
            <Link href={`/w/${item.slug}`}>
              <span className="shared-score">{item.score}점</span>
              <span className="shared-text">{item.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Frame>
  );
}
