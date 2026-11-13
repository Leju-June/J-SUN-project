CREATE SCHEMA "j_son";
--> statement-breakpoint
CREATE TABLE "j_son"."completions" (
	"user_id" bigint NOT NULL,
	"case_id" text NOT NULL,
	"finished_at" timestamp with time zone DEFAULT now() NOT NULL,
	"play_seconds" integer NOT NULL,
	CONSTRAINT "completions_user_id_case_id_pk" PRIMARY KEY("user_id","case_id")
);
--> statement-breakpoint
CREATE TABLE "j_son"."progress" (
	"user_id" bigint NOT NULL,
	"case_id" text NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_user_id_case_id_pk" PRIMARY KEY("user_id","case_id")
);
--> statement-breakpoint
CREATE TABLE "j_son"."submissions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"case_id" text NOT NULL,
	"board_id" text NOT NULL,
	"answers" jsonb NOT NULL,
	"correct_count" smallint NOT NULL,
	"total" smallint NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "submissions_case_board_idx" ON "j_son"."submissions" USING btree ("case_id","board_id");