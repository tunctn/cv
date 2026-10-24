CREATE TABLE "user_avatar" (
	"user_id" text PRIMARY KEY NOT NULL,
	"media_type" text NOT NULL,
	"data" text NOT NULL,
	"provider_image" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_avatar" ADD CONSTRAINT "user_avatar_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;