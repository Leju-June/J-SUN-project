import { z } from "zod";

/** 사건 데이터의 모양. 작가가 쓰는 YAML이 이 틀에 맞는지 읽을 때 확인한다. */

const id = z.string().regex(/^[a-z0-9][a-z0-9.-]*$/, "id는 영문 소문자·숫자·점·하이픈만 쓴다");
/** 해금 조건. board:<id> · topic:<id> · page:<id> · chapter:<id> */
const cond = z.string().regex(/^(board|topic|page|chapter):[a-z0-9][a-z0-9.-]*$/, "조건은 board:/topic:/page:/chapter: 로 시작한다");
const lines = z.array(z.string()).min(1);

export const clueSchema = z.strictObject({
  id,
  label: z.string().min(1),
  kind: z.enum(["person", "place", "time", "thing"]),
  aliases: z.array(z.string().min(1)).default([]),
});

export const chapterSchema = z.strictObject({
  id,
  title: z.string().min(1),
  goal: z.string().min(1),
  requires: z.array(cond).default([]),
});

export const documentSchema = z.strictObject({
  id,
  chapter: id,
  title: z.string().min(1),
  filename: z.string().min(1),
  requires: z.array(cond).default([]),
  lines,
});

export const topicSchema = z.strictObject({
  id,
  label: z.string().min(1),
  requires: z.array(cond).default([]),
  lines,
});

export const threadSchema = z.strictObject({
  id,
  chapter: id,
  name: z.string().min(1),
  role: z.string().min(1),
  requires: z.array(cond).default([]),
  intro: lines,
  topics: z.array(topicSchema),
});

export const pageSchema = z.strictObject({
  id,
  title: z.string().min(1),
  site: z.string().min(1),
  url: z.string().min(1),
  requires: z.array(cond).default([]),
  keywords: z.array(z.string().min(1)).min(1),
  lines,
});

export const webSchema = z.strictObject({
  name: z.string().min(1),
  chapter: id,
  pages: z.array(pageSchema),
});

export const blankSchema = z.strictObject({
  /** 정답 단서의 id. 여럿이면 그중 어느 것이든 맞다. */
  answer: z.union([id, z.array(id).min(1)]).transform((value) => (Array.isArray(value) ? value : [value])),
});

export const boardSchema = z.strictObject({
  id,
  chapter: id,
  format: z.enum(["statement", "mail", "chat"]),
  title: z.string().min(1),
  requires: z.array(cond).default([]),
  /** chat 형식일 때 이 질문을 보낼 대화 상대. */
  thread: id.optional(),
  /** mail 형식일 때 받는 사람과 제목. */
  mail: z.strictObject({ to: z.string().min(1), subject: z.string().min(1) }).optional(),
  text: z.string().min(1),
  blanks: z.record(z.string().regex(/^[a-z][a-z0-9]*$/), blankSchema),
  /** chat 형식에서 틀렸을 때 상대가 하는 말. */
  fail: z.array(z.string()).default([]),
  /** 맞혔을 때 나오는 글. chat 형식에서는 상대의 답이다. */
  solved: lines,
});

export const metaSchema = z.strictObject({
  id,
  title: z.string().min(1),
  /** 사건 번호. 예) J-SON I */
  episode: z.string().min(1),
  badge: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  station: z.string().min(1),
  blurb: lines,
  chapters: z.array(chapterSchema).min(1),
  ending: z.strictObject({
    after: id,
    title: z.string().min(1),
    lines,
    outro: z.string().optional(),
  }),
});

export type Clue = z.infer<typeof clueSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
export type CaseDocument = z.infer<typeof documentSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type Thread = z.infer<typeof threadSchema>;
export type Page = z.infer<typeof pageSchema>;
export type Web = z.infer<typeof webSchema>;
export type Board = z.infer<typeof boardSchema>;
export type CaseMeta = z.infer<typeof metaSchema>;

export type CaseData = CaseMeta & {
  clues: Clue[];
  documents: CaseDocument[];
  threads: Thread[];
  web: Web | null;
  boards: Board[];
};

export const caseFiles = {
  clues: z.array(clueSchema),
  documents: z.array(documentSchema),
  threads: z.array(threadSchema),
  web: webSchema,
  boards: z.array(boardSchema),
};

/** 추리판 글을 글과 빈칸으로 나눈다. */
export type BoardPart = { t: "text"; v: string } | { t: "blank"; id: string };

export function boardParts(raw: string): BoardPart[] {
  const text = raw.trim();
  const parts: BoardPart[] = [];
  let last = 0;
  for (const match of text.matchAll(/\{([a-z][a-z0-9]*)\}/g)) {
    if (match.index > last) parts.push({ t: "text", v: text.slice(last, match.index) });
    parts.push({ t: "blank", id: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ t: "text", v: text.slice(last) });
  return parts;
}
