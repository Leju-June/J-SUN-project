"use client";

import Link from "next/link";
import { THEMES, type ThemeId } from "@/lib/themes";
import { Frame } from "./Frame";
import { InstallButton } from "./InstallButton";
import { useLiveData } from "./useLiveData";

type Me = {
  quota: { remaining: number; allowance: number };
  achievements: { code: string; title: string; earned: boolean }[];
};

type Props = { theme: ThemeId | null; onThemeChange: (theme: ThemeId) => void };

export function PersonalPanel({ theme, onThemeChange }: Props) {
  const me = useLiveData<Me>("/api/me");

  return (
    <>
      <Frame title="접속 정보">
        <p className="panel-line">손님 (로그인하지 않음)</p>
        {me && (
          <p className="panel-line">
            남은 소원 {me.quota.remaining} / {me.quota.allowance}
          </p>
        )}
        <p className="panel-line">
          <Link href="/login" className="panel-link">
            로그인
          </Link>
        </p>
        <InstallButton />
      </Frame>

      <Frame title="업적">
        <ul className="panel-list">
          {me?.achievements.map((achievement) => (
            <li key={achievement.code} className={achievement.earned ? "earned" : "locked"}>
              {achievement.earned ? "[x] " : "[ ] "}
              {achievement.title}
            </li>
          ))}
        </ul>
      </Frame>

      <Frame title="테마">
        <div className="panel-list" role="group" aria-label="테마 선택">
          {THEMES.map((option) => (
            <button
              key={option.id}
              type="button"
              className="link-button theme-option"
              aria-pressed={theme === option.id}
              onClick={() => onThemeChange(option.id)}
            >
              {theme === option.id ? "(*) " : "( ) "}
              {option.name}
            </button>
          ))}
        </div>
      </Frame>
    </>
  );
}
