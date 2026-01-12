ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "otp_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "otp_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "otp_last_sent_at" timestamp;