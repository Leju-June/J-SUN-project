import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import type { z } from "zod";
import { type CaseData, caseFiles, metaSchema } from "./case";

/** 사건 데이터 폴더. 사건 하나가 폴더 하나다. */
const CASES_DIR = path.join(process.cwd(), "cases");

/** 지금 서비스하는 사건. 사건이 늘면 고르는 화면을 붙인다. */
export const DEFAULT_CASE_ID = "chaeju-villa";

function readYaml<S extends z.ZodType>(dir: string, file: string, schema: S, optional = false): z.infer<S> | null {
  const full = path.join(dir, file);
  if (!existsSync(full)) {
    if (optional) return null;
    throw new Error(`${file} 파일이 없습니다 (${dir})`);
  }
  const parsed = schema.safeParse(parse(readFileSync(full, "utf8")));
  if (!parsed.success) {
    const where = parsed.error.issues.map((issue) => `  ${issue.path.join(".") || "(맨 위)"}: ${issue.message}`).join("\n");
    throw new Error(`${path.basename(dir)}/${file} 형식 오류\n${where}`);
  }
  return parsed.data;
}

export function listCaseIds(): string[] {
  return readdirSync(CASES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export function readCase(caseId: string): CaseData {
  const dir = path.join(CASES_DIR, caseId);
  const meta = readYaml(dir, "case.yaml", metaSchema)!;
  if (meta.id !== caseId) throw new Error(`${caseId}/case.yaml의 id(${meta.id})가 폴더 이름과 다릅니다`);
  return {
    ...meta,
    clues: readYaml(dir, "clues.yaml", caseFiles.clues)!,
    documents: readYaml(dir, "documents.yaml", caseFiles.documents, true) ?? [],
    threads: readYaml(dir, "messenger.yaml", caseFiles.threads, true) ?? [],
    web: readYaml(dir, "web.yaml", caseFiles.web, true),
    boards: readYaml(dir, "boards.yaml", caseFiles.boards)!,
  };
}

const cache = new Map<string, CaseData>();

/** 요청마다 쓰는 읽기. 운영에서는 한 번 읽어 둔다. 없는 사건이면 null. */
export function loadCase(caseId: string): CaseData | null {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(caseId)) return null;
  const cached = process.env.NODE_ENV === "production" ? cache.get(caseId) : undefined;
  if (cached) return cached;
  if (!existsSync(path.join(CASES_DIR, caseId, "case.yaml"))) return null;
  const data = readCase(caseId);
  cache.set(caseId, data);
  return data;
}
