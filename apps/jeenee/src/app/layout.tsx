import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { AppShell } from "@/components/AppShell";
import { THEME_BOOT_SCRIPT } from "@/lib/themes";
// 글꼴은 로컬 파일이다. 브라우저는 해당 테마에서 글자를 그릴 때만 필요한 조각을 내려받는다.
import "@fontsource/gowun-batang/400.css";
import "@fontsource/gowun-batang/700.css";
import "@fontsource/great-vibes/400.css";
import "@fontsource/nanum-gothic-coding/400.css";
import "@fontsource/nanum-gothic-coding/700.css";
import "@fontsource/nanum-brush-script/400.css";
import "@fontsource/unifrakturmaguntia/400.css";
import "@fontsource/gowun-dodum/400.css";
import "@fontsource/black-han-sans/400.css";
import "@fontsource/gaegu/400.css";
import "@fontsource/gaegu/700.css";
import "./fonts.css";
import "./globals.css";

const pixel = localFont({ src: "../../node_modules/@kfonts/neodgm/neodgm.woff2", preload: false, variable: "--font-pixel" });
const fontVariables = pixel.variable;
const gaId = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  title: { default: "Jeenee", template: "%s · Jeenee" },
  description: "소원을 말해봐. 적힌 그대로 모두 이루어줄게.",
  openGraph: { siteName: "Jeenee", locale: "ko_KR" },
};

export const viewport: Viewport = { themeColor: "#120b24" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
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
