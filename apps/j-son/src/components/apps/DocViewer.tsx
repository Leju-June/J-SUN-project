"use client";

import { useEffect } from "react";
import { useGame } from "../game-context";
import { RichDoc } from "../Rich";

export function DocViewer({ id }: { id: string }) {
  const { view, markOpened } = useGame();
  const doc = view.documents.find((d) => d.id === id);

  useEffect(() => {
    if (doc) markOpened(doc.id);
  }, [doc, markOpened]);

  if (!doc) return <div className="docview">문서를 찾을 수 없습니다.</div>;
  return (
    <div className="docview">
      <RichDoc lines={doc.lines} src={`문서 · ${doc.title}`} />
    </div>
  );
}
