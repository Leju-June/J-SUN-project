"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { DEFAULT_THEME, isTheme, saveTheme, themeColor, themeRender, type ThemeId } from "@/lib/themes";
import { startTypingRender } from "@/lib/typing-render";
import { PersonalPanel } from "./PersonalPanel";
import { SharedPanel } from "./SharedPanel";
import { ThemeScene } from "./ThemeScene";

type Drawer = "personal" | "shared" | null;

export function AppShell({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId | null>(null);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const personal = useRef<HTMLElement>(null);
  const shared = useRef<HTMLElement>(null);
  const center = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(isTheme(current) ? current : DEFAULT_THEME);
  }, []);

  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor(theme) ?? "");
    const stop =
      themeRender(theme) === "typing" && personal.current && shared.current && center.current
        ? startTypingRender([personal.current, shared.current, center.current])
        : undefined;
    if (themeRender(theme) === "scene") root.dataset.opening = "";
    delete root.dataset.booting;
    return () => {
      stop?.();
      delete root.dataset.opening;
    };
  }, [theme]);

  const onOpened = useCallback(() => {
    delete document.documentElement.dataset.opening;
  }, []);

  useEffect(() => setDrawer(null), [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawer(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const changeTheme = (next: ThemeId) => {
    saveTheme(next);
    setTheme(next);
  };

  const toggle = (next: Exclude<Drawer, null>) => setDrawer((current) => (current === next ? null : next));

  return (
    <div className="shell">
      <ThemeScene theme={theme} active={theme !== null && themeRender(theme) === "scene"} onOpened={onOpened} />
      <aside ref={personal} id="personal-panel" className={drawer === "personal" ? "side side-left open" : "side side-left"} data-render-region>
        <PersonalPanel theme={theme} onThemeChange={changeTheme} />
      </aside>

      <div ref={center} className="center" data-render-region>
        <header className="top">
          <button type="button" className="link-button drawer-toggle" aria-expanded={drawer === "personal"} aria-controls="personal-panel" onClick={() => toggle("personal")}>
            내 창
          </button>
          <Link href="/" className="brand">
            Jeenee
          </Link>
          <button type="button" className="link-button drawer-toggle" aria-expanded={drawer === "shared"} aria-controls="shared-panel" onClick={() => toggle("shared")}>
            공유
          </button>
        </header>
        <main>{children}</main>
      </div>

      <aside ref={shared} id="shared-panel" className={drawer === "shared" ? "side side-right open" : "side side-right"} data-render-region>
        <SharedPanel />
      </aside>

      {drawer && <button type="button" className="backdrop" aria-label="사이드바 닫기" onClick={() => setDrawer(null)} />}
    </div>
  );
}
