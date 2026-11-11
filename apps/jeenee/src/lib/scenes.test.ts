import { describe, expect, it } from "vitest";
import { SceneSplitter } from "./scenes";

function run(chunks: string[]) {
  const splitter = new SceneSplitter();
  const deltas = chunks.flatMap((chunk) => splitter.push(chunk));
  deltas.push(...splitter.flush());
  return { deltas, scenes: splitter.scenes() };
}

describe("SceneSplitter", () => {
  it("구분선으로 장면을 나눈다", () => {
    expect(run(["첫 장면\n=====\n둘째 장면"]).scenes).toEqual(["첫 장면", "둘째 장면"]);
  });

  it("조각나서 도착한 구분선도 인식하고 화면에 내보내지 않는다", () => {
    const { deltas, scenes } = run(["첫 장면\n=", "==", "==", "\n둘째", " 장면"]);
    expect(scenes).toEqual(["첫 장면", "둘째 장면"]);
    expect(deltas.map((delta) => delta.text).join("")).not.toContain("=");
  });

  it("앞뒤에 붙은 구분선은 빈 장면을 만들지 않는다", () => {
    expect(run(["=====\n본문\n=====\n"]).scenes).toEqual(["본문"]);
    expect(run(["본문\n====="]).scenes).toEqual(["본문"]);
  });

  it("줄바꿈이 포함된 장면을 유지한다", () => {
    expect(run(["가\n\n나\n", "다\n=====\n라"]).scenes).toEqual(["가\n\n나\n다", "라"]);
  });
});
