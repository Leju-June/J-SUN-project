import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  date,
  doublePrecision,
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { ScoreBreakdown } from "@/lib/scoring";

export const keywords = pgTable("keywords", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  word: text("word").notNull().unique(),
  description: text("description").notNull(),
  slot: text("slot").notNull(), // loophole | price | material | ending | genie | twist | voice
  baseWeight: real("base_weight").notNull().default(1),
  severity: smallint("severity").notNull(),
  // 이 영역의 소원에서 더 자주 후보에 오른다. 비어 있으면 어느 소원에나 같다.
  domains: text("domains")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  // 같은 모티프의 키워드는 한 이야기에 겹쳐 뽑히지 않게 한다.
  motif: text("motif"),
});

export const users = pgTable("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  email: text("email").unique(),
  provider: text("provider"), // email | kakao
  plan: text("plan").notNull().default("free"),
});

export const ipQuotas = pgTable("ip_quotas", {
  ip: inet("ip").primaryKey(),
  used: integer("used").notNull().default(0),
  allowance: integer("allowance").notNull().default(3),
  weekStart: date("week_start").notNull(),
  note: text("note"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const wishes = pgTable(
  "wishes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    text: text("text").notNull(),
    ip: inet("ip").notNull(),
    wishHash: text("wish_hash").notNull(),
    userId: bigint("user_id", { mode: "number" }).references(() => users.id),
    isRepeat: boolean("is_repeat").notNull().default(false),
    status: text("status").notNull().default("generating"), // generating | done | failed
    scenes: jsonb("scenes").$type<string[]>(),
    score: smallint("score"),
    scoreBreakdown: jsonb("score_breakdown").$type<ScoreBreakdown>(),
    costUsd: doublePrecision("cost_usd").notNull().default(0),
    shareStatus: text("share_status").notNull().default("private"), // private | approved | rejected | hidden
    shareSlug: text("share_slug").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("wishes_ip_hash_idx").on(t.ip, t.wishHash),
    index("wishes_created_at_idx").on(t.createdAt),
    // 동시에 같은 소원을 보내도 무료 사용자는 한 건만 들어간다.
    uniqueIndex("wishes_first_wish_idx")
      .on(t.ip, t.wishHash)
      .where(sql`${t.isRepeat} = false AND ${t.status} <> 'failed'`),
  ],
);

export const wishKeywords = pgTable(
  "wish_keywords",
  {
    wishId: uuid("wish_id")
      .notNull()
      .references(() => wishes.id, { onDelete: "cascade" }),
    keywordId: bigint("keyword_id", { mode: "number" })
      .notNull()
      .references(() => keywords.id),
  },
  (t) => [primaryKey({ columns: [t.wishId, t.keywordId] })],
);

export const userAchievements = pgTable(
  "user_achievements",
  {
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id),
    code: text("code").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.code] })],
);
