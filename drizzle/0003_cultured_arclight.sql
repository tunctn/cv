CREATE TABLE "cv_file" (
	"id" text PRIMARY KEY NOT NULL,
	"cv_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"media_type" text NOT NULL,
	"size" integer NOT NULL,
	"data" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cv_file" ADD CONSTRAINT "cv_file_cv_id_cv_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cv"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_file" ADD CONSTRAINT "cv_file_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cv_file_cv_id_idx" ON "cv_file" USING btree ("cv_id");