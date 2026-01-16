ALTER TABLE "payment_events" RENAME TO "user_payment_events";--> statement-breakpoint
ALTER TABLE "user_payment_events" RENAME COLUMN "payment_method" TO "source";--> statement-breakpoint
ALTER TABLE "user_payment_events" DROP CONSTRAINT "payment_events_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_payment_events" DROP CONSTRAINT "payment_events_subscription_id_user_subscriptions_id_fk";
--> statement-breakpoint
ALTER TABLE "user_payment_events" ADD COLUMN "currency" varchar(3) NOT NULL;--> statement-breakpoint
ALTER TABLE "user_payment_events" ADD COLUMN "paddle_txn_id" text;--> statement-breakpoint
ALTER TABLE "user_payment_events" ADD COLUMN "invoice_number" text;--> statement-breakpoint
ALTER TABLE "user_payment_events" ADD COLUMN "receipt_url" text;--> statement-breakpoint
ALTER TABLE "user_payment_events" ADD COLUMN "payment_method_type" text;--> statement-breakpoint
ALTER TABLE "user_payment_events" ADD COLUMN "billed_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_payment_events" ADD COLUMN "raw_response" json;--> statement-breakpoint
ALTER TABLE "user_payment_events" ADD CONSTRAINT "user_payment_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_payment_events" ADD CONSTRAINT "user_payment_events_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_payment_events" DROP COLUMN "reference";--> statement-breakpoint
ALTER TABLE "user_payment_events" DROP COLUMN "payload";