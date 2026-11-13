import { bigint, bigserial, index, integer, jsonb, pgSchema, primaryKey, smallint, text, timestamp } from "drizzle-orm/pg-core";
import type { GameState } from "@/engine/state";

/** 이 서비스 전용 스키마. user_id는 게이트웨이의 auth.users.id를 가리키지만 표 소유가 달라 외래 키는 걸지 않는다. */
export const jsonSchema = pgSchema("j_son");

/** 사건별 진행 상태 한 덩어리. */
export const progress = jsonSchema.table(
  "progress",
  {
    userId: bigint("user_id", { mode: "number" }).notNull(),
    caseId: text("case_id").notNull(),
    state: jsonb("state").$type<GameState>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.caseId] })],
);

/** 추리 제출 기록. 통계와 난이도 조절에 쓴다. */
export const submissions = jsonSchema.table(
  "submissions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    caseId: text("case_id").notNull(),
    boardId: text("board_id").notNull(),
    answers: jsonb("answers").$type<Record<string, string>>().notNull(),
    correctCount: smallint("correct_count").notNull(),
    total: smallint("total").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("submissions_case_board_idx").on(t.caseId, t.boardId)],
);

/** 사건 완료 기록. 로비 카드의 "사건 n/m 해결"에 쓴다. */
export const completions = jsonSchema.table(
  "completions",
  {
    userId: bigint("user_id", { mode: "number" }).notNull(),
    caseId: text("case_id").notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }).notNull().defaultNow(),
    playSeconds: integer("play_seconds").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.caseId] })],
);
