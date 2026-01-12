ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_token_hash" text;-->statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_token_expires_at" timestamp;