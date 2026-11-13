export type IconName = "doc" | "chat" | "globe" | "box" | "help" | "eye";

/** 옛 업무용 컴퓨터 느낌의 작은 그림. 32칸 격자에 굵은 외곽선으로 그린다. */
export function Icon({ name, size = 32 }: { name: IconName; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 32 32" aria-hidden shapeRendering="crispEdges">
      {name === "doc" && (
        <>
          <path d="M7 3h13l6 6v20H7z" fill="#fff" stroke="#000" />
          <path d="M20 3v6h6" fill="#c8c8c8" stroke="#000" />
          <path d="M11 13h11M11 17h11M11 21h11M11 25h7" stroke="#1a3a8a" />
        </>
      )}
      {name === "chat" && (
        <>
          <path d="M3 5h20v13H12l-5 5v-5H3z" fill="#ffe680" stroke="#000" />
          <path d="M13 12h16v11h-3v4l-4-4h-9z" fill="#fff" stroke="#000" />
          <path d="M7 10h12M7 13h8" stroke="#7a5c00" />
        </>
      )}
      {name === "globe" && (
        <g shapeRendering="geometricPrecision">
          <circle cx="16" cy="16" r="12" fill="#3f8fd8" stroke="#000" />
          <path d="M4 16h24M16 4c-6 6-6 18 0 24M16 4c6 6 6 18 0 24M6.5 10h19M6.5 22h19" fill="none" stroke="#dff0ff" strokeWidth="1.2" />
          <path d="M9 9c3-1 5 1 4 4s-4 2-5 5M19 18c3-1 5 0 5 3s-3 3-4 5" fill="none" stroke="#2f9e44" strokeWidth="2.4" />
        </g>
      )}
      {name === "box" && (
        <>
          <path d="M4 9h24v18H4z" fill="#c9a66b" stroke="#000" />
          <path d="M3 5h26v5H3z" fill="#e2c48d" stroke="#000" />
          <path d="M12 14h8v4h-8z" fill="#fff" stroke="#000" />
        </>
      )}
      {name === "help" && (
        <g shapeRendering="geometricPrecision">
          <circle cx="16" cy="16" r="12" fill="#f4d000" stroke="#000" />
          <path d="M12 12.5c0-5.5 8.5-5.5 8.5 0 0 3-4 3-4 6.5" fill="none" stroke="#000" strokeWidth="2.6" />
          <rect x="15" y="22" width="3" height="3" fill="#000" />
        </g>
      )}
      {name === "eye" && (
        <g shapeRendering="geometricPrecision">
          <path d="M2 16Q16 4 30 16Q16 28 2 16Z" fill="#fff" stroke="#000" strokeWidth="1.6" />
          <circle cx="16" cy="16" r="5.5" fill="#0a246a" />
          <circle cx="16" cy="16" r="2" fill="#fff" />
        </g>
      )}
    </svg>
  );
}
