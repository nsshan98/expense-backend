-- Add missing date columns to user_subscriptions table
ALTER TABLE "user_subscriptions" ADD COLUMN IF NOT EXISTS "start_date" timestamp;
ALTER TABLE "user_subscriptions" ADD COLUMN IF NOT EXISTS "end_date" timestamp;
ALTER TABLE "user_subscriptions" ADD COLUMN IF NOT EXISTS "next_renewal_date" timestamp;
