ALTER TABLE "payment_events" ALTER COLUMN "amount" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "budgets" ALTER COLUMN "amount" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "subscription_plans" ALTER COLUMN "price_monthly" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "subscription_plans" ALTER COLUMN "price_yearly" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "predictions_cache" ALTER COLUMN "predicted_monthly_spend" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "predictions" ALTER COLUMN "predicted_amount" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN IF NOT EXISTS "month" text;