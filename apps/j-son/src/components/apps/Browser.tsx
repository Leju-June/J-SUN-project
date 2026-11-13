"use client";

import { useEffect, useState } from "react";
import type { SearchResult } from "@/engine/play";
import { LIMITS } from "@/engine/state";
import { useGame } from "../game-context";
import { RichDoc } from "../Rich";

type Place = { kind: "home" } | { kind: "results"; query: string; results: SearchResult[] | null } | { kind: "page"; id: string };

/** 검색 창 하나짜리 브라우저. 적어 넣은 말에 걸리는 문서만 나오고, 찾아낸 문서만 열 수 있다. */
export function Browser() {
  const { view, state, search, markOpened } = useGame();
  const [trail, setTrail] = useState<Place[]>([{ kind: "home" }]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const place = trail[trail.length - 1];
  const browser = view.browser;

  useEffect(() => markOpened("app:browser"), [markOpened]);

  if (!browser) return <div className="browser-off">네트워크에 연결되어 있지 않습니다.</div>;

  const go = (next: Place) => setTrail((list) => [...list, next]);
  const run = async (text: string) => {
    const q = text.trim().slice(0, LIMITS.query);
    if (!q || busy) return;
    setQuery(q);
    setBusy(true);
    const results = await search(q);
    setBusy(false);
    go({ kind: "results", query: q, results });
  };

  const page = place.kind === "page" ? browser.pages.find((p) => p.id === place.id) : undefined;
  const address = place.kind === "page" ? (page?.url ?? "") : place.kind === "results" ? `nuribom.example/search?q=${place.query}` : "nuribom.example";
  const recent = state.searches.slice(-8).reverse();

  const form = (big: boolean) => (
    <form
      className={big ? "search-form big" : "search-form"}
      onSubmit={(event) => {
        event.preventDefault();
        void run(query);
      }}
    >
      <input className="field" value={query} maxLength={LIMITS.query} placeholder="검색어를 적으세요" aria-label="검색어" autoComplete="off" spellCheck={false} onChange={(event) => setQuery(event.target.value)} />
      <button type="submit" className="btn" disabled={busy || !query.trim()}>
        {busy ? "찾는 중…" : "검색"}
      </button>
    </form>
  );

  return (
    <div className="browser">
      <div className="browser-bar">
        <button type="button" className="btn btn-small" disabled={trail.length < 2} onClick={() => setTrail((list) => list.slice(0, -1))}>
          ◀ 뒤로
        </button>
        <button type="button" className="btn btn-small" onClick={() => setTrail([{ kind: "home" }])}>
          홈
        </button>
        <span className="address" title={address}>
          {address}
        </span>
      </div>

      <div className="browser-view">
        {place.kind === "home" && (
          <div className="search-home">
            <h2 className="search-logo">{browser.name}</h2>
            <p className="search-sub">세상의 모든 봄소식, {browser.name} 검색</p>
            {form(true)}
            {recent.length > 0 && (
              <div className="search-recent">
                <span>최근 검색</span>
                {recent.map((q) => (
                  <button key={q} type="button" className="link" onClick={() => void run(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {place.kind === "results" && (
          <div className="search-results">
            <div className="search-top">
              <strong className="search-logo small">{browser.name}</strong>
              {form(false)}
            </div>
            {place.results === null ? (
              <p className="search-none">검색 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.</p>
            ) : place.results.length === 0 ? (
              <div className="search-none">
                <p>
                  <strong>‘{place.query}’</strong>에 맞는 문서가 없습니다.
                </p>
                <p>다른 말로 찾아보세요. 사람 이름보다는 동네나 사건에 얽힌 말이 잘 걸립니다.</p>
              </div>
            ) : (
              <>
                <p className="search-count">
                  ‘{place.query}’ 검색 결과 {place.results.length}건
                </p>
                <ul>
                  {place.results.map((result) => (
                    <li key={result.id} className="result">
                      <button type="button" className={`link result-title${state.opened.includes(result.id) ? " visited" : ""}`} onClick={() => go({ kind: "page", id: result.id })}>
                        {result.title}
                      </button>
                      <span className="result-url">{result.url}</span>
                      <p>{result.snippet}…</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {place.kind === "page" &&
          (page ? (
            <WebPage key={page.id} id={page.id} site={page.site} lines={page.lines} />
          ) : (
            <p className="search-none">문서를 불러오는 중…</p>
          ))}
      </div>
    </div>
  );
}

function WebPage({ id, site, lines }: { id: string; site: string; lines: string[] }) {
  const { markOpened } = useGame();
  useEffect(() => markOpened(id), [markOpened, id]);
  return (
    <article className="webpage">
      <div className="webpage-site">{site}</div>
      <RichDoc lines={lines} src={`인터넷 · ${site}`} />
    </article>
  );
}
