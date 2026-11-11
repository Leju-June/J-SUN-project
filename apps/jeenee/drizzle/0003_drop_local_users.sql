ALTER TABLE "user_achievements" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "user_achievements" CASCADE;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
ALTER TABLE "wishes" DROP CONSTRAINT IF EXISTS "wishes_user_id_users_id_fk";
