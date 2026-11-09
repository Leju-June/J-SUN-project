import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, THEMES, isTheme } from "./themes";

describe("테마", () => {
  it("테마마다 고유한 렌더 방식을 가진다", () => {
    const renders = THEMES.map((theme) => theme.render);
    expect(new Set(renders).size).toBe(renders.length);
  });

  it("id가 겹치지 않고 기본 테마가 목록에 있다", () => {
    const ids = THEMES.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(isTheme(DEFAULT_THEME)).toBe(true);
  });
});
