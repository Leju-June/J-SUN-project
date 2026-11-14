/** footer와 안내 페이지에 쓰는 공개 문의 주소. */
export const CONTACT_EMAIL = "junhune12@gmail.com";

/**
 * 로비에 보이는 서비스 목록. href가 없으면 자리만 잡아 둔 칸이다.
 * summary가 있으면 로비가 그 주소를 불러 카드에 진행 현황을 붙인다.
 */
export const SERVICES = [
  {
    id: "jeenee",
    name: "Jeenee",
    description: "소원을 말해봐. 적힌 그대로 모두 이루어줄게.",
    href: "/jeenee",
    summary: null,
  },
  {
    id: "j-son",
    name: "J-SON",
    description: "컴퓨터로 단서를 모아, 진상을 밝힌다.",
    href: "/j-son",
    summary: "/j-son/api/summary",
  },
  {
    id: "next",
    name: "빈 자리",
    description: "다음 서비스를 준비 중입니다.",
    href: null,
    summary: null,
  },
] as const;
