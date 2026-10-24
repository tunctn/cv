CREATE TABLE "guest_device" (
	"hash" text PRIMARY KEY NOT NULL,
	"cvs" integer DEFAULT 0 NOT NULL,
	"ai_messages" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
