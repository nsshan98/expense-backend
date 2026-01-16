ALTER TABLE "user_payment_events" RENAME COLUMN "subscription_id" TO "paddle_subscription_id";--> statement-breakpoint
ALTER TABLE "user_payment_events" DROP CONSTRAINT "user_payment_events_subscription_id_user_subscriptions_id_fk";
