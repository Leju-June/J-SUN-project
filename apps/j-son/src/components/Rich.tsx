"use client";

import { memo } from "react";
import { type Block, parseBlock, parseRich, plainText } from "@/engine/rich";
import { useGame } from "./game-context";

/** 누른 말을 잠깐 표시한다. 상태를 거치지 않고 바로 칠해서 긴 글에서도 가볍다. */
function mark(element: HTMLElement) {
  element.classList.remove("tk-hit");
  void element.offsetWidth;
  element.classList.add("tk-hit");
}

type LineProps = { line: string; src: string; onPick: (text: string, src: string, ctx: string) => void };

/** 본문 한 줄. 모든 말을 누를 수 있고, 어느 말이 단서인지는 표시하지 않는다. */
const Line = memo(function Line({ line, src, onPick }: LineProps) {
  return (
    <span
      className="rich"
      onClick={(event) => {
        const target = (event.target as HTMLElement).closest<HTMLElement>("[data-t]");
        if (!target || window.getSelection()?.toString()) return;
        mark(target);
        onPick(target.dataset.t!, src, plainText(line));
      }}
    >
      {parseRich(line).map((seg, i) =>
        seg.token ? (
          <span key={i} className="tk" data-t={seg.token}>
            {seg.text}
          </span>
        ) : (
          seg.text
        ),
      )}
    </span>
  );
});

export function Rich({ line, src }: { line: string; src: string }) {
  const { addNote } = useGame();
  return <Line line={line} src={src} onPick={addNote} />;
}

const TAG: Record<Exclude<Block["kind"], "gap">, "h3" | "p"> = { h: "h3", li: "p", meta: "p", p: "p" };

/** 문서와 웹 문서의 본문. 줄 머리 표시에 따라 제목·목록·작은 글씨로 나뉜다. */
export function RichDoc({ lines, src }: { lines: string[]; src: string }) {
  const { addNote } = useGame();
  return (
    <div className="doc-body">
      {lines.map((line, i) => {
        const kind = parseBlock(line).kind;
        if (kind === "gap") return <div key={i} className="doc-gap" />;
        const Tag = TAG[kind];
        const body = line.replace(/^(# |- |; )/, "");
        return (
          <Tag key={i} className={`doc-${kind}`}>
            <Line line={body} src={src} onPick={addNote} />
          </Tag>
        );
      })}
    </div>
  );
}
