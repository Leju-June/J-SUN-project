import { describe, expect, it } from "vitest";
import { grade } from "./grade";
import { readCase } from "./loader";
import { play, readState } from "./play";
import { resolve } from "./progress";
import { parseBlock, parseRich, plainText } from "./rich";
import { type GameState, newState } from "./state";
import { validateCase } from "./validate";
import { buildView } from "./view";

const data = readCase("chaeju-villa");
const board = (id: string) => data.boards.find((b) => b.id === id)!;
const fresh = () => newState(data.id, "한지우", Date.now() - 60_000);
const note = (text: string) => ({ id: text, text, src: "", ctx: "", at: 0 });

const OVERVIEW = { room: "204호", who: "이든", family: "세미", reporter: "박채주", from: "2층", to: "5층" };
const ASK = { day: "화요일", off: "휴무일", cam: "CCTV" };
const REPORT = { day: "화요일", guard: "강한석", market: "야시장", blackout: "정전", power: "발전기", keeper: "박채주" };

const step = (state: GameState, action: Parameters<typeof play>[2]) => {
  const outcome = play(data, state, action);
  if ("error" in outcome) throw new Error(outcome.error);
  return outcome;
};

describe("본문 표기", () => {
  it("감싼 말은 조사와 떨어져 눌린다", () => {
    expect(parseRich("[박채주]가 신고했다.")).toEqual([
      { text: "박채주", token: "박채주" },
      { text: "가" },
      { text: " " },
      { text: "신고했다", token: "신고했다" },
      { text: "." },
    ]);
  });

  it("감싼 말은 띄어쓰기를 품을 수 있고, 앞에 붙은 부호는 눌리지 않는다", () => {
    const segs = parseRich("([작년 11월 11일] 밤)");
    expect(segs.filter((seg) => seg.token).map((seg) => seg.token)).toEqual(["작년 11월 11일", "밤"]);
    expect(segs[0]).toEqual({ text: "(" });
  });

  it("줄 머리 표시를 읽고, 걷어낸 글을 낸다", () => {
    expect(parseBlock("# [화요동]").kind).toBe("h");
    expect(parseBlock("- 목록").kind).toBe("li");
    expect(parseBlock("; 작은 글씨").kind).toBe("meta");
    expect(parseBlock("").kind).toBe("gap");
    expect(plainText("- [운영]: 매주 [화요일]")).toBe("운영: 매주 화요일");
  });
});

describe("채점", () => {
  it("맞은 개수만 알려 준다", () => {
    const result = grade(data, board("overview"), { ...OVERVIEW, who: "문가을", family: "김사수", reporter: "오로라" }, []);
    expect(result).toEqual({ correct: 3, total: 6, solved: false, hint: null });
  });

  it("한두 칸 틀렸는데 그 단서가 노트에 없으면 '못 찾은 단서'라고 한다", () => {
    const result = grade(data, board("overview"), { ...OVERVIEW, to: "1층" }, [note("204호"), note("2층")]);
    expect(result.correct).toBe(5);
    expect(result.hint).toBe("missing");
  });

  it("한두 칸 틀렸고 그 단서가 노트에 있으면 '잘 살펴보라'고 한다", () => {
    const result = grade(data, board("overview"), { ...OVERVIEW, to: "1층", from: "5층" }, [note("2층"), note("5층")]);
    expect(result.correct).toBe(4);
    expect(result.hint).toBe("review");
  });

  it("같은 뜻의 말과 조사가 붙은 말, 띄어쓰기 차이를 받아 준다", () => {
    expect(grade(data, board("overview"), { ...OVERVIEW, reporter: "집주인", who: "이든이" }, []).solved).toBe(true);
    expect(grade(data, board("report"), { ...REPORT, market: "화요야시장", day: "화요일마다" }, []).solved).toBe(true);
  });

  it("빈칸을 비워 두면 틀린 것으로 센다", () => {
    expect(grade(data, board("ask-guard"), { day: "화요일" }, []).correct).toBe(1);
  });
});

describe("해금", () => {
  it("처음에는 프롤로그만 열려 있다", () => {
    const progress = resolve(data, fresh());
    expect([...progress.chapters]).toEqual(["prologue"]);
  });

  it("풀었다는 표시만 고친 상태는 통하지 않는다", () => {
    const forged: GameState = { ...fresh(), boards: { overview: { answers: { ...OVERVIEW, who: "문가을" }, solved: true, tries: 1 } }, asked: ["kang-shift", "park-204"], searches: ["화요동"] };
    const progress = resolve(data, forged);
    expect(progress.solved.size).toBe(0);
    expect(progress.chapters.has("ch1")).toBe(false);
    // 앞 질문을 건너뛴 질문, 아직 없는 대화 상대의 질문, 열리지 않은 검색은 버려진다.
    expect(progress.asked).toEqual([]);
    expect(progress.found.size).toBe(0);
  });

  it("열리지 않은 자료와 정답은 화면으로 나가지 않는다", () => {
    const state = fresh();
    const sent = JSON.stringify(buildView(data, state, resolve(data, state)));
    for (const secret of ["강한석입니다", "발전기", "누리봄", "1장", "person.park", "aliases", "휴무일", "가지런하다"]) expect(sent).not.toContain(secret);
    expect(sent).toContain("아이고");
    expect(sent).toContain("한지우 형사");
  });

  it("물어본 질문만 답이 나간다", () => {
    const state = { ...fresh(), asked: ["park-reports"] };
    const view = buildView(data, state, resolve(data, state));
    const park = view.threads.find((thread) => thread.id === "park")!;
    expect(park.log.map((entry) => entry.id)).toEqual(["park-reports"]);
    expect(park.topics.map((topic) => topic.id)).toContain("park-204");
    expect(JSON.stringify(view)).not.toContain("편의점");
  });
});

describe("플레이", () => {
  it("프롤로그부터 데모 끝까지 풀린다", () => {
    let state = fresh();
    expect(play(data, state, { type: "submit", boardId: "report", answers: REPORT })).toEqual({ error: "아직 열리지 않은 추리판입니다." });

    let outcome = step(state, { type: "submit", boardId: "overview", answers: { ...OVERVIEW, to: "4층" } });
    expect(outcome.submit).toMatchObject({ correct: 5, total: 6, solved: false, hint: "아직 찾지 못한 단서가 있는 것 같아." });
    expect(outcome.view.threads.map((thread) => thread.id)).toEqual(["park"]);

    outcome = step(outcome.state, { type: "submit", boardId: "overview", answers: OVERVIEW });
    expect(outcome.submit).toMatchObject({ solved: true });
    expect(outcome.state.boards.overview.tries).toBe(2);
    expect(outcome.view.current).toBe("ch1");
    expect(outcome.view.threads.map((thread) => thread.id)).toEqual(["park", "kang"]);
    expect(outcome.view.browser).toEqual({ name: "누리봄", pages: [] });
    expect(outcome.view.threads[1].draft).toBe("ask-guard");
    expect(outcome.view.archive[0].sentence).toContain("204호에 살던 이든");
    state = outcome.state;

    outcome = step(state, { type: "search", query: "화요동 야시장" });
    expect(outcome.search!.results.map((result) => result.id)).toEqual(["w-hwayo", "w-market"]);
    expect(outcome.view.browser!.pages.map((page) => page.id)).toEqual(["w-hwayo", "w-market"]);
    expect(step(outcome.state, { type: "search", query: "강한석" }).search!.results).toEqual([]);
    state = outcome.state;

    outcome = step(state, { type: "submit", boardId: "ask-guard", answers: ASK });
    expect(outcome.submit).toMatchObject({ solved: true, log: "@ask-guard" });
    const kang = outcome.view.threads.find((thread) => thread.id === "kang")!;
    expect(kang.log.at(-1)!.question).toContain("네 번 모두 화요일이었습니다");
    expect(kang.draft).toBeNull();
    expect(kang.topics.map((topic) => topic.id)).toContain("kang-keeper");
    expect(outcome.view.boards.map((b) => b.id)).toContain("report");
    expect(outcome.finished).toBe(false);

    outcome = step(outcome.state, { type: "submit", boardId: "report", answers: REPORT });
    expect(outcome.finished).toBe(true);
    expect(outcome.view.ending!.lines.join(" ")).toContain("화요일이다");
    // 다시 내도 시도 횟수는 늘지 않는다.
    expect(step(outcome.state, { type: "submit", boardId: "report", answers: {} }).state.boards.report.tries).toBe(1);
  });

  it("상태를 읽을 때 넘치는 값과 표기 글자를 걷어낸다", () => {
    const raw = { ...fresh(), playerName: "[한]{지}우", playSeconds: 999_999, memo: "가".repeat(9000), notes: [note("[204호]"), { ...note("빈 말"), text: " " }] };
    const state = readState(raw, data.id)!;
    expect(state.playerName).toBe("한지우");
    expect(state.playSeconds).toBeLessThanOrEqual(61);
    expect(state.memo.length).toBe(5000);
    expect(state.notes.map((n) => n.text)).toEqual(["204호"]);
    expect(readState({ ...fresh(), caseId: "other" }, data.id)).toBeNull();
    expect(readState("엉뚱한 값", data.id)).toBeNull();
  });
});

describe("사건 데이터", () => {
  it("검증을 통과한다", () => {
    expect(validateCase(data)).toEqual([]);
  });

  it("정답을 누를 수 없게 되면 잡아낸다", () => {
    const broken = structuredClone(data);
    for (const thread of broken.threads) for (const topic of thread.topics) topic.lines = topic.lines.map((line) => line.replaceAll("[휴무일]", "쉬는 날"));
    expect(validateCase(broken).join("\n")).toContain("휴무일");
  });

  it("없는 것을 가리키는 조건을 잡아낸다", () => {
    const broken = structuredClone(data);
    broken.threads[0].topics[0].requires = ["topic:nowhere"];
    expect(validateCase(broken).join("\n")).toContain("topic:nowhere");
  });
});
