ALTER TABLE "keywords" ADD COLUMN "domains" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "keywords" ADD COLUMN "motif" text;