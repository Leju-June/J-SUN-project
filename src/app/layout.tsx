import type { Metadata, Viewport } from "next";
import { Great_Vibes, Gowun_Batang } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import { AppShell } from "@/components/AppShell";
import { THEME_BOOT_SCRIPT } from "@/lib/themes";
import "./globals.css";

const serif = Gowun_Batang({ weight: ["400", "700"], subsets: ["latin"], preload: false, variable: "--font-serif" });
const script = Great_Vibes({ weight: "400", subsets: ["latin"], preload: false, variable: "--font-script" });
const pixel = localFont({ src: "../../node_modules/@kfonts/neodgm/neodgm.woff2", preload: false, variable: "--font-pixel" });
const gaId = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  title: "Jeenee",
  description: "소원을 말해봐. 적힌 그대로 모두 이루어줄게.",
};

export const viewport: Viewport = { themeColor: "#120b24" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${serif.variable} ${script.variable} ${pixel.variable}`} suppressHydrationWarning>
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
