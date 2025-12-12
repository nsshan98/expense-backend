CREATE TABLE "merge_map" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"source_name" text NOT NULL,
	"target_name" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "predictions_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"predicted_monthly_spend" numeric NOT NULL,
	"prediction_generated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "normalized_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hashed_refresh_token" text;--> statement-breakpoint
ALTER TABLE "merge_map" ADD CONSTRAINT "merge_map_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions_cache" ADD CONSTRAINT "predictions_cache_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions_cache" ADD CONSTRAINT "predictions_cache_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_id_date_idx" ON "transactions" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "user_id_normalized_name_idx" ON "transactions" USING btree ("user_id","normalized_name");--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "type";