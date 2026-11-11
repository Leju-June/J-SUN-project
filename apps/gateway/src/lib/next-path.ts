/** 로그인 뒤 돌아갈 곳. 이 사이트 안의 경로만 허용하고 나머지는 로비로 보낸다. */
export function safeNext(value: unknown) {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\r\n]/.test(value)) return "/";
  return value;
}
