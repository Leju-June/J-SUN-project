"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { THEMES, type ThemeId } from "@/lib/themes";
import { Frame } from "./Frame";
import { InstallButton } from "./InstallButton";
import { useLiveData } from "./useLiveData";

type Me = {
  user: { id: number; displayName: string } | null;
  quota: { remaining: number; allowance: number };
  achievements: { code: string; title: string; hint: string; earned: boolean }[];
};

type Props = { theme: ThemeId | null; onThemeChange: (theme: ThemeId) => void };

export function PersonalPanel({ theme, onThemeChange }: Props) {
  const me = useLiveData<Me>("/api/me");
  const earned = me?.achievements.filter((achievement) => achievement.earned).length ?? 0;

  return (
    <>
      <Frame title="접속 정보">
        <p className="panel-line">{me?.user ? `${me.user.displayName} 님` : "손님 (로그인하지 않음)"}</p>
        {me && (
          <p className="panel-line">
            남은 소원 {me.quota.remaining} / {me.quota.allowance}
          </p>
        )}
        <p className="panel-line panel-links">
          <Link href="/history" className="panel-link">
            내 기록
          </Link>
          <Link href="/rules" className="panel-link">
            지니의 규칙
          </Link>
          {/* 로그인과 로비는 게이트웨이가 맡으므로 basePath를 붙이지 않는 a 태그를 쓴다. */}
          {me?.user ? (
            <form method="post" action="/logout" className="panel-inline-form">
              <input type="hidden" name="next" value="/jeenee" />
              <button type="submit" className="link-button panel-link">
                로그아웃
              </button>
            </form>
          ) : (
            <a href="/login?next=/jeenee" className="panel-link">
              로그인
            </a>
          )}
          <a href="/" className="panel-link">
            J-SUN 로비
          </a>
        </p>
        <InstallButton />
      </Frame>

      <Frame title={me ? `업적 ${earned} / ${me.achievements.length}` : "업적"}>
        <ul className="panel-list">
          {me?.achievements.map((achievement) => (
            <li key={achievement.code} className={achievement.earned ? "earned" : "locked"} title={achievement.hint}>
              {achievement.earned ? "[x] " : "[ ] "}
              {achievement.title}
            </li>
          ))}
        </ul>
      </Frame>

      <Frame title="테마">
        <div className="theme-grid" role="group" aria-label="테마 선택">
          {THEMES.map((option) => (
            <button
              key={option.id}
              type="button"
              className="link-button theme-option"
              aria-pressed={theme === option.id}
              style={{ "--swatch-base": option.swatch[0], "--swatch-mark": option.swatch[1] } as CSSProperties}
              onClick={() => onThemeChange(option.id)}
            >
              <span className="theme-mark" aria-hidden>
                {theme === option.id ? "(*)" : "( )"}
              </span>
              {option.name}
            </button>
          ))}
        </div>
      </Frame>
    </>
  );
}
