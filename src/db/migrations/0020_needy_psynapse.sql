CREATE TABLE "pending_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"otp_hash" text NOT NULL,
	"otp_expires_at" timestamp NOT NULL,
	"timezone" text DEFAULT 'UTC',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "pending_registrations_email_unique" UNIQUE("email")
);
