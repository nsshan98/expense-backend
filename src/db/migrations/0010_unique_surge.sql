DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscription_orders') THEN
        ALTER TABLE "subscription_orders" RENAME TO "plan_orders";
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
        ALTER TABLE "subscriptions" RENAME TO "user_subscriptions";
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscription_plans') THEN
        ALTER TABLE "subscription_plans" RENAME TO "user_subscription_plans";
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "payment_events" RENAME CONSTRAINT "payment_events_subscription_id_subscriptions_id_fk" TO "payment_events_subscription_id_user_subscriptions_id_fk";
EXCEPTION
    WHEN undefined_object THEN null; -- constraint missing
    WHEN duplicate_object THEN null; -- target constraint exists
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "payment_submissions" RENAME CONSTRAINT "payment_submissions_order_id_subscription_orders_id_fk" TO "payment_submissions_order_id_plan_orders_id_fk";
EXCEPTION
    WHEN undefined_object THEN null;
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "plan_orders" RENAME CONSTRAINT "subscription_orders_user_id_users_id_fk" TO "plan_orders_user_id_users_id_fk";
EXCEPTION
    WHEN undefined_object THEN null;
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "plan_orders" RENAME CONSTRAINT "subscription_orders_plan_id_subscription_plans_id_fk" TO "plan_orders_plan_id_user_subscription_plans_id_fk";
EXCEPTION
    WHEN undefined_object THEN null;
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "user_subscriptions" RENAME CONSTRAINT "subscriptions_user_id_users_id_fk" TO "user_subscriptions_user_id_users_id_fk";
EXCEPTION
    WHEN undefined_object THEN null;
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "user_subscriptions" RENAME CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fk" TO "user_subscriptions_plan_id_user_subscription_plans_id_fk";
EXCEPTION
    WHEN undefined_object THEN null;
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "users" RENAME CONSTRAINT "users_plan_id_subscription_plans_id_fk" TO "users_plan_id_user_subscription_plans_id_fk";
EXCEPTION
    WHEN undefined_object THEN null;
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD';