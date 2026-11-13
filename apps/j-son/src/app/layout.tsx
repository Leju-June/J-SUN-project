import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "J-SON", template: "%s · J-SON" },
  description: "형사의 컴퓨터로 단서를 모아, 사건의 진상을 직접 짜 맞추는 추리 게임.",
  openGraph: { siteName: "J-SON", locale: "ko_KR" },
};

export const viewport: Viewport = { themeColor: "#000000" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
