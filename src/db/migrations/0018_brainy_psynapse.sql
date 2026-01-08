ALTER TABLE "users" ADD COLUMN "otp_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "otp_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "otp_last_sent_at" timestamp;