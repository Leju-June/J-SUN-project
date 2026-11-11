export const SCENE_DELIMITER = "=====";

const DELIMITER_LINE = /(^|\n)[ \t]*={3,}[ \t]*\n/;
const PARTIAL_DELIMITER = /^[ \t]*=*[ \t]*$/;

export type SceneDelta = { scene: number; text: string };

/** 스트리밍 텍스트를 구분선 기준으로 장면별 조각으로 나눈다. */
export class SceneSplitter {
  private buffer = "";
  private current: string[] = [""];

  push(chunk: string) {
    this.buffer += chunk;
    const deltas: SceneDelta[] = [];

    for (let match = DELIMITER_LINE.exec(this.buffer); match; match = DELIMITER_LINE.exec(this.buffer)) {
      this.append(this.buffer.slice(0, match.index), deltas);
      this.buffer = this.buffer.slice(match.index + match[0].length);
      if (this.current[this.current.length - 1] !== "") this.current.push("");
    }

    // 구분선이 잘려서 도착할 수 있으니 마지막 줄이 구분선처럼 보이면 남겨둔다.
    const lastBreak = this.buffer.lastIndexOf("\n");
    if (PARTIAL_DELIMITER.test(this.buffer.slice(lastBreak + 1))) {
      if (lastBreak > 0) {
        this.append(this.buffer.slice(0, lastBreak), deltas);
        this.buffer = this.buffer.slice(lastBreak);
      }
    } else {
      this.append(this.buffer, deltas);
      this.buffer = "";
    }
    return deltas;
  }

  flush() {
    const deltas: SceneDelta[] = [];
    if (!/^\s*=*\s*$/.test(this.buffer)) this.append(this.buffer, deltas);
    this.buffer = "";
    return deltas;
  }

  scenes() {
    return this.current.map((scene) => scene.trim()).filter(Boolean);
  }

  private append(text: string, deltas: SceneDelta[]) {
    const index = this.current.length - 1;
    const addition = this.current[index] === "" ? text.trimStart() : text;
    if (!addition) return;
    this.current[index] += addition;
    deltas.push({ scene: index, text: addition });
  }
}
