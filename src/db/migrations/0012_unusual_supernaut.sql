ALTER TABLE "subscriptions" ADD COLUMN "alert_days" integer;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "subscription_alert_days" integer DEFAULT 3;