/** Caddy가 덮어쓴 값만 신뢰한다. 프록시가 없으면 사용자가 보낸 헤더는 무시한다. */
export function clientIp(headers: Headers) {
  if (process.env.TRUST_PROXY === "1") {
    const ip = headers.get("x-real-ip");
    if (!ip) throw new Error("x-real-ip 헤더가 없습니다.");
    return ip;
  }
  return "127.0.0.1";
}
