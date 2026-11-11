import { describe, expect, it } from "vitest";
import { safeNext } from "./next-path";
import { hashPassword, verifyPassword } from "./password";

describe("safeNext", () => {
  it("사이트 안 경로만 돌려준다", () => {
    expect(safeNext("/jeenee")).toBe("/jeenee");
    expect(safeNext("/jeenee/history?x=1")).toBe("/jeenee/history?x=1");
  });
  it("바깥 주소나 이상한 값은 로비로 보낸다", () => {
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext(undefined)).toBe("/");
    expect(safeNext("")).toBe("/");
  });
});

describe("password", () => {
  it("같은 비밀번호만 통과한다", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("wrong", stored)).toBe(false);
    expect(await verifyPassword("anything", "garbage")).toBe(false);
  });
});
