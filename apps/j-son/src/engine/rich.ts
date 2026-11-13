/**
 * 본문 표기법. 서버와 화면이 같이 쓴다.
 *
 * - `[말]`로 감싼 부분은 조사와 떨어져 한 덩어리로 눌린다. 예) `[박채주]가` → "박채주"만 눌린다.
 * - 감싸지 않은 말은 어절 단위로 눌리고, 앞뒤 문장부호는 빠진다.
 * - 어떤 말이 정답 단서인지는 여기 담기지 않는다. 모든 말이 똑같이 눌린다.
 */
export type Seg = { text: string; token?: string };

export type BlockKind = "h" | "li" | "meta" | "p" | "gap";
export type Block = { kind: BlockKind; segs: Seg[] };

const BRACKET = /\[([^\[\]]+)\]/g;
const LEAD = /^[^\p{L}\p{N}]+/u;
const TRAIL = /[^\p{L}\p{N}]+$/u;

/** 감싸지 않은 글을 어절로 쪼갠다. attachedStart/End면 대괄호에 붙은 조각이라 누를 수 없다. */
function freeText(text: string, attachedStart: boolean, attachedEnd: boolean, out: Seg[]) {
  const parts = text.split(/(\s+)/);
  parts.forEach((part, i) => {
    if (part === "") return;
    if (/^\s+$/.test(part)) return void out.push({ text: part });
    const glued = (i === 0 && attachedStart) || (i === parts.length - 1 && attachedEnd);
    if (glued) return void out.push({ text: part });
    const lead = part.match(LEAD)?.[0] ?? "";
    const rest = part.slice(lead.length);
    const trail = rest.match(TRAIL)?.[0] ?? "";
    const core = rest.slice(0, rest.length - trail.length);
    if (lead) out.push({ text: lead });
    if (core) out.push({ text: core, token: core });
    if (trail) out.push({ text: trail });
  });
}

export function parseRich(line: string): Seg[] {
  const out: Seg[] = [];
  let last = 0;
  for (const match of line.matchAll(BRACKET)) {
    const start = match.index;
    if (start > last) freeText(line.slice(last, start), last > 0, true, out);
    out.push({ text: match[1], token: match[1] });
    last = start + match[0].length;
  }
  if (last < line.length) freeText(line.slice(last), last > 0, false, out);
  return out;
}

/** 줄 머리 표시를 읽는다: "# " 제목 · "- " 목록 · "; " 작은 글씨 · 빈 줄. */
export function parseBlock(line: string): Block {
  if (line.trim() === "") return { kind: "gap", segs: [] };
  if (line.startsWith("# ")) return { kind: "h", segs: parseRich(line.slice(2)) };
  if (line.startsWith("- ")) return { kind: "li", segs: parseRich(line.slice(2)) };
  if (line.startsWith("; ")) return { kind: "meta", segs: parseRich(line.slice(2)) };
  return { kind: "p", segs: parseRich(line) };
}

/** 표기를 걷어낸 글. 검색 결과 미리보기와 단서의 출처 문장에 쓴다. */
export function plainText(line: string) {
  return line
    .replace(/^(# |- |; )/, "")
    .replace(BRACKET, "$1");
}

/** 작가가 감싸 둔 말만 뽑는다. 사건 검증에서 "이 단서를 본문에서 누를 수 있는가"를 볼 때 쓴다. */
export function bracketTokens(line: string) {
  return [...line.matchAll(BRACKET)].map((match) => match[1]);
}
