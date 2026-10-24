ALTER TABLE "cv" ADD COLUMN "share_id" text;--> statement-breakpoint
ALTER TABLE "cv" ADD COLUMN "share_chat" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cv" ADD CONSTRAINT "cv_share_id_unique" UNIQUE("share_id");