-- Add timestamp columns to user_subscription_plans table
ALTER TABLE "user_subscription_plans" ADD COLUMN "created_at" timestamp DEFAULT now();-->statement-breakpoint
ALTER TABLE "user_subscription_plans" ADD COLUMN "updated_at" timestamp DEFAULT now();
