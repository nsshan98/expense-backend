ALTER TABLE "user_payment_events" ALTER COLUMN "paddle_subscription_id" SET DATA TYPE text;
ALTER TABLE "user_payment_events" ALTER COLUMN "paddle_subscription_id" DROP NOT NULL;
