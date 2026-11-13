import type { Metadata, Viewport } from "next";
import { currentUser } from "@/lib/session";
import { SiteFooter } from "@/components/SiteFooter";
import { SunMark } from "@/components/SunMark";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "J-SUN", template: "%s · J-SUN" },
  description: "J-SUN의 서비스들이 모이는 곳.",
  openGraph: { siteName: "J-SUN", locale: "ko_KR" },
};

export const viewport: Viewport = { themeColor: "#000000" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  return (
    <html lang="ko">
      <body>
        <header className="top">
          <a href="/" className="brand">
            <SunMark size={28} />
            <span>J-SUN</span>
          </a>
          <nav className="account">
            {user ? (
              <>
                <span className="who">{user.displayName} 님</span>
                <form method="post" action="/logout">
                  <button type="submit" className="link">
                    로그아웃
                  </button>
                </form>
              </>
            ) : (
              <>
                <a href="/login" className="link">
                  로그인
                </a>
                <a href="/signup" className="link">
                  회원가입
                </a>
              </>
            )}
          </nav>
        </header>
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
