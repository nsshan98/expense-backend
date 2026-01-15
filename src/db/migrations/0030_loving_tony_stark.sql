ALTER TABLE "coupons" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "coupons" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "recur" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "maximum_recurring_intervals" integer;