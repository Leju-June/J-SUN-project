import type { HTMLAttributes, ReactNode, Ref } from "react";

const HORIZONTAL = "─".repeat(400);
const VERTICAL = "│".repeat(300);

type Props = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  bodyRef?: Ref<HTMLDivElement>;
  children: ReactNode;
};

/** 내용이 넘치면 안쪽만 스크롤되는 상자. 테두리 글자는 글자 상자를 쓰는 테마에서만 보인다. */
export function Frame({ title, bodyRef, className, children, ...rest }: Props) {
  return (
    <div {...rest} className={className ? `box ${className}` : "box"}>
      <span className="edge edge-row edge-top" aria-hidden>
        <span>┌</span>
        <span className="edge-fill">{HORIZONTAL}</span>
        <span>┐</span>
      </span>
      <span className="edge edge-side edge-left" aria-hidden>
        {VERTICAL}
      </span>
      <span className="edge edge-side edge-right" aria-hidden>
        {VERTICAL}
      </span>
      <span className="edge edge-row edge-bottom" aria-hidden>
        <span>└</span>
        <span className="edge-fill">{HORIZONTAL}</span>
        <span>┘</span>
      </span>
      {title && <div className="frame-title">{title}</div>}
      <div className="frame-body" ref={bodyRef}>
        {children}
      </div>
    </div>
  );
}
