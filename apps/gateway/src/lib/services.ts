/** 로비에 보이는 서비스 목록. href가 없으면 자리만 잡아 둔 칸이다. */
export const SERVICES = [
  {
    id: "jeenee",
    name: "Jeenee",
    description: "소원을 말해봐. 적힌 그대로 모두 이루어줄게.",
    href: "/jeenee",
  },
  {
    id: "next",
    name: "빈 자리",
    description: "다음 서비스를 준비 중입니다.",
    href: null,
  },
] as const;
