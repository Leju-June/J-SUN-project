import { bigint, bigserial, index, pgSchema, text, timestamp } from "drizzle-orm/pg-core";

/** J-SUN 공통 계정. 다른 서비스는 auth 스키마를 읽기만 하고, 표 구조는 여기서만 바꾼다. */
export const authSchema = pgSchema("auth");

export const users = authSchema.table("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  email: text("email").notNull().unique(), // 소문자로 저장한다.
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = authSchema.table(
  "sessions",
  {
    // 쿠키에는 원본 토큰만 두고 DB에는 해시만 남긴다.
    tokenHash: text("token_hash").primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);
