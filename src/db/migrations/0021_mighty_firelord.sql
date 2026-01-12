CREATE TABLE IF NOT EXISTS "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"provider" text NOT NULL,
	"discount_type" text NOT NULL,
	"discount_amount" double precision NOT NULL,
	"currency" text,
	"max_uses" integer,
	"used_count" integer DEFAULT 0,
	"expires_at" timestamp,
	"paddle_discount_id" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plan_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"interval" text NOT NULL,
	"currency" text NOT NULL,
	"amount" double precision NOT NULL,
	"paddle_price_id" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'internal';--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN IF NOT EXISTS "currency" text;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN IF NOT EXISTS "paddle_subscription_id" text;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN IF NOT EXISTS "paddle_price_id" text;--> statement-breakpoint
ALTER TABLE "user_subscription_plans" ADD COLUMN IF NOT EXISTS "plan_key" text;--> statement-breakpoint
ALTER TABLE "user_subscription_plans" ADD COLUMN IF NOT EXISTS "paddle_product_id" text;--> statement-breakpoint
ALTER TABLE "user_subscription_plans" ADD COLUMN IF NOT EXISTS "is_paddle_enabled" boolean DEFAULT false;-->statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plan_pricing" ADD CONSTRAINT "plan_pricing_plan_id_user_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."user_subscription_plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;-->statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_subscription_plans" ADD CONSTRAINT "user_subscription_plans_plan_key_unique" UNIQUE("plan_key");
EXCEPTION
 WHEN duplicate_object THEN null;
 WHEN duplicate_table THEN null;
END $$;