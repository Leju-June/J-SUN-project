import type { Metadata, Viewport } from "next";
import { Gowun_Batang } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import { InstallButton } from "@/components/InstallButton";
import "./globals.css";

const font = Gowun_Batang({ weight: ["400", "700"], subsets: ["latin"], preload: false });
const gaId = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  title: "Jeenee",
  description: "소원을 말해봐. 적힌 그대로 모두 이루어줄게.",
};

export const viewport: Viewport = { themeColor: "#120b24" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={font.className}>
        <header className="top">
          <Link href="/" className="brand">
            Jeenee
          </Link>
          <nav>
            <Link href="/hall">이번 주의 소원</Link>
            <Link href="/login">로그인</Link>
            <InstallButton />
          </nav>
        </header>
        <main>{children}</main>
        {gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaId}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
