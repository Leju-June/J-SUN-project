CREATE TABLE "ip_quotas" (
	"ip" "inet" PRIMARY KEY NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"allowance" integer DEFAULT 3 NOT NULL,
	"week_start" date NOT NULL,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keywords" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"word" text NOT NULL,
	"description" text NOT NULL,
	"slot" text NOT NULL,
	"base_weight" real DEFAULT 1 NOT NULL,
	"severity" smallint NOT NULL,
	CONSTRAINT "keywords_word_unique" UNIQUE("word")
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"user_id" bigint NOT NULL,
	"code" text NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_achievements_user_id_code_pk" PRIMARY KEY("user_id","code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" text,
	"provider" text,
	"plan" text DEFAULT 'free' NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wish_keywords" (
	"wish_id" uuid NOT NULL,
	"keyword_id" bigint NOT NULL,
	CONSTRAINT "wish_keywords_wish_id_keyword_id_pk" PRIMARY KEY("wish_id","keyword_id")
);
--> statement-breakpoint
CREATE TABLE "wishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"ip" "inet" NOT NULL,
	"wish_hash" text NOT NULL,
	"user_id" bigint,
	"is_repeat" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'generating' NOT NULL,
	"scenes" jsonb,
	"score" smallint,
	"score_breakdown" jsonb,
	"cost_usd" double precision DEFAULT 0 NOT NULL,
	"share_status" text DEFAULT 'private' NOT NULL,
	"share_slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wishes_share_slug_unique" UNIQUE("share_slug")
);
--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wish_keywords" ADD CONSTRAINT "wish_keywords_wish_id_wishes_id_fk" FOREIGN KEY ("wish_id") REFERENCES "public"."wishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wish_keywords" ADD CONSTRAINT "wish_keywords_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wishes_ip_hash_idx" ON "wishes" USING btree ("ip","wish_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "wishes_first_wish_idx" ON "wishes" USING btree ("ip","wish_hash") WHERE "wishes"."is_repeat" = false AND "wishes"."status" <> 'failed';