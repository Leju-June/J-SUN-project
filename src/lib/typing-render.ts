// 직접 타이핑 효과를 내는 영역과 상자 테두리는 건너뛴다.
const SKIP = "[data-typed], .edge, script, style";
const TICK_MS = 30;
const FINISH_TICKS = 90;

type Pending = { node: Text; offset: number; range: Range };

const isVisible = (element: HTMLElement) => getComputedStyle(element).visibility !== "hidden";

/**
 * 영역의 글자를 앞에서부터 드러낸다. DOM을 바꾸지 않고 하이라이트로만 숨기므로
 * 레이아웃이 밀리지 않고 React가 관리하는 텍스트와도 충돌하지 않는다.
 */
export function startTypingRender(regions: HTMLElement[]) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || typeof Highlight === "undefined" || !CSS.highlights) return () => {};

  const hidden = new Highlight();
  const caret = new Highlight();
  CSS.highlights.set("typing-hidden", hidden);
  CSS.highlights.set("typing-caret", caret);

  const queue: Pending[] = [];
  const seen = new WeakSet<Text>();
  const caretRange = new Range();
  let timer: ReturnType<typeof setInterval> | undefined;

  const enqueue = (root: Node) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.currentNode; node; node = walker.nextNode() as Node) {
      if (!(node instanceof Text) || seen.has(node) || !node.data.trim()) continue;
      if (node.parentElement?.closest(SKIP)) continue;
      seen.add(node);
      const range = new Range();
      range.selectNodeContents(node);
      hidden.add(range);
      queue.push({ node, offset: 0, range });
    }
  };

  const stopTicking = () => {
    clearInterval(timer);
    timer = undefined;
    caret.clear();
  };

  const tick = () => {
    const remaining = queue.reduce((sum, item) => sum + item.node.length - item.offset, 0);
    let budget = Math.max(2, Math.ceil(remaining / FINISH_TICKS));

    while (budget > 0 && queue.length > 0) {
      const item = queue[0];
      const advance = Math.min(budget, item.node.length - item.offset);
      item.offset += advance;
      budget -= advance;
      if (item.node.isConnected && item.offset < item.node.length) {
        item.range.setStart(item.node, item.offset);
        caretRange.setStart(item.node, item.offset);
        caretRange.setEnd(item.node, item.offset + 1);
        caret.add(caretRange);
      } else {
        hidden.delete(item.range);
        queue.shift();
      }
    }
    if (queue.length === 0) stopTicking();
  };

  const startTicking = () => {
    if (queue.length > 0 && timer === undefined) timer = setInterval(tick, TICK_MS);
  };

  const finish = () => {
    queue.length = 0;
    hidden.clear();
    stopTicking();
  };

  for (const region of regions) if (isVisible(region)) enqueue(region);
  startTicking();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const region = mutation.target.parentElement?.closest<HTMLElement>("[data-render-region]");
      if (region && !isVisible(region)) continue;
      mutation.addedNodes.forEach(enqueue);
    }
    startTicking();
  });
  for (const region of regions) observer.observe(region, { childList: true, subtree: true });

  // 기다리기 싫은 사용자는 클릭이나 키 입력으로 바로 넘긴다.
  window.addEventListener("pointerdown", finish);
  window.addEventListener("keydown", finish);

  return () => {
    observer.disconnect();
    finish();
    window.removeEventListener("pointerdown", finish);
    window.removeEventListener("keydown", finish);
    CSS.highlights.delete("typing-hidden");
    CSS.highlights.delete("typing-caret");
  };
}
