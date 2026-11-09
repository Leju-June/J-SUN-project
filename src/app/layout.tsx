import type { Metadata, Viewport } from "next";
import { Black_Han_Sans, Gaegu, Gowun_Batang, Gowun_Dodum, Great_Vibes, Nanum_Brush_Script, Nanum_Gothic_Coding, UnifrakturMaguntia } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import { AppShell } from "@/components/AppShell";
import { THEME_BOOT_SCRIPT } from "@/lib/themes";
import "./globals.css";

const serif = Gowun_Batang({ weight: ["400", "700"], subsets: ["latin"], preload: false, variable: "--font-serif" });
const script = Great_Vibes({ weight: "400", subsets: ["latin"], preload: false, variable: "--font-script" });
const pixel = localFont({ src: "../../node_modules/@kfonts/neodgm/neodgm.woff2", preload: false, variable: "--font-pixel" });
// 아래 글꼴은 해당 테마에서 글자를 그릴 때만 내려받는다.
const mono = Nanum_Gothic_Coding({ weight: ["400", "700"], subsets: ["latin"], preload: false, variable: "--font-mono" });
const brush = Nanum_Brush_Script({ weight: "400", subsets: ["latin"], preload: false, variable: "--font-brush" });
const blackletter = UnifrakturMaguntia({ weight: "400", subsets: ["latin"], preload: false, variable: "--font-blackletter" });
const dodum = Gowun_Dodum({ weight: "400", subsets: ["latin"], preload: false, variable: "--font-dodum" });
const display = Black_Han_Sans({ weight: "400", subsets: ["latin"], preload: false, variable: "--font-display" });
const hand = Gaegu({ weight: ["400", "700"], subsets: ["latin"], preload: false, variable: "--font-hand" });
const fontVariables = [serif, script, pixel, mono, brush, blackletter, dodum, display, hand].map((font) => font.variable).join(" ");
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
