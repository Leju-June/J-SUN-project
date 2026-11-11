CREATE INDEX "wishes_created_at_idx" ON "wishes" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "keywords" DROP COLUMN IF EXISTS "embedding";--> statement-breakpoint
ALTER TABLE "wish_keywords" DROP COLUMN IF EXISTS "similarity";--> statement-breakpoint
DROP EXTENSION IF EXISTS vector;
