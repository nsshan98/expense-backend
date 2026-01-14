ALTER TABLE "plan_pricing" ALTER COLUMN "plan_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "plan_pricing" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "plan_pricing" ADD COLUMN "min_quantity" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "plan_pricing" ADD COLUMN "max_quantity" integer;--> statement-breakpoint
ALTER TABLE "plan_pricing" ADD COLUMN "unit_price_overrides" text;