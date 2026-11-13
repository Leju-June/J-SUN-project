import { loadCase } from "@/engine/loader";
import { type PlayResponse, play, readState, requestSchema } from "@/engine/play";
import { sessionUser } from "@/lib/session";
import { deleteProgress, loadProgress, recordCompletion, recordSubmission, saveProgress } from "@/lib/store";

/** 상태 하나가 이보다 클 일은 없다. */
const MAX_BODY = 256 * 1024;

const json = (body: PlayResponse | { error: string }, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * 게임의 유일한 창구. 화면은 상태를 통째로 보내고, 서버는 지금 열린 범위의 화면만 돌려준다.
 * 로그인했으면 같은 상태를 계정에도 적는다.
 */
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY * 4) return json({ error: "요청이 너무 큽니다." }, 413);
  const text = await request.text();
  if (text.length > MAX_BODY) return json({ error: "요청이 너무 큽니다." }, 413);

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "요청을 읽을 수 없습니다." }, 400);
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "요청 형식이 맞지 않습니다." }, 400);

  const { caseId, action } = parsed.data;
  const data = loadCase(caseId);
  if (!data) return json({ error: "없는 사건입니다." }, 404);

  const user = await sessionUser();
  const who = user ? { displayName: user.displayName } : null;

  if (action.type === "reset") {
    if (user) await deleteProgress(user.id, caseId);
    return json({ user: who, saved: false, state: null, view: null });
  }

  let state = readState(parsed.data.state, caseId);

  if (action.type === "load" && user) {
    // 다른 기기에서 더 진행했으면 계정 쪽을 따른다.
    const stored = readState(await loadProgress(user.id, caseId), caseId);
    if (stored && (!state || stored.updatedAt >= state.updatedAt)) state = stored;
  }
  if (!state) {
    if (action.type === "load") return json({ user: who, saved: false, state: null, view: null });
    return json({ error: "진행 상태가 없습니다." }, 400);
  }

  const outcome = play(data, state, action);
  if ("error" in outcome) return json({ error: outcome.error }, 409);

  let saved = false;
  if (user) {
    saved = await saveProgress(user.id, caseId, outcome.state);
    if (outcome.submission) {
      const { boardId, answers, correct, total } = outcome.submission;
      await recordSubmission(user.id, caseId, boardId, answers, correct, total);
    }
    if (outcome.finished) await recordCompletion(user.id, caseId, outcome.state.playSeconds);
  }

  return json({ user: who, saved, state: action.type === "load" ? outcome.state : null, view: outcome.view, search: outcome.search, submit: outcome.submit });
}
