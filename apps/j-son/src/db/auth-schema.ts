import { bigserial, pgSchema, text, timestamp } from "drizzle-orm/pg-core";

/**
 * J-SUN 게이트웨이가 만들고 관리하는 공통 계정 표. 이 서비스는 읽기만 한다.
 * drizzle.config.ts의 schema 경로에 포함하지 않으므로 여기 정의는 마이그레이션을 만들지 않는다.
 */
export const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authSessions = authSchema.table("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: bigserial("user_id", { mode: "number" }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
