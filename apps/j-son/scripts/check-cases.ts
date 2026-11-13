import { listCaseIds, readCase } from "../src/engine/loader";
import { validateCase } from "../src/engine/validate";

// 빌드 전에 사건 데이터를 검사한다. 하나라도 걸리면 빌드를 멈춘다.
let failed = false;

for (const caseId of listCaseIds()) {
  try {
    const data = readCase(caseId);
    const errors = validateCase(data);
    if (errors.length === 0) {
      const topics = data.threads.reduce((sum, thread) => sum + thread.topics.length, 0);
      console.log(`✓ ${caseId}: 장 ${data.chapters.length} · 추리판 ${data.boards.length} · 질문 ${topics} · 웹 문서 ${data.web?.pages.length ?? 0} · 단서 ${data.clues.length}`);
    } else {
      failed = true;
      console.error(`✗ ${caseId}`);
      for (const error of errors) console.error(`  - ${error}`);
    }
  } catch (error) {
    failed = true;
    console.error(`✗ ${caseId}\n${error instanceof Error ? error.message : error}`);
  }
}

if (failed) process.exit(1);
