ALTER TABLE "user_settings" ALTER COLUMN "subscription_alert_days" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "global_amount" double precision;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "global_currency" text;