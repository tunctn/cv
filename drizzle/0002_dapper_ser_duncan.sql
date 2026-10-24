CREATE TABLE "cv_photo" (
	"hash" text PRIMARY KEY NOT NULL,
	"data" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cv_version" (
	"id" text PRIMARY KEY NOT NULL,
	"cv_id" text NOT NULL,
	"label" text NOT NULL,
	"source" text NOT NULL,
	"template" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cv_version" ADD CONSTRAINT "cv_version_cv_id_cv_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cv"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cv_version_cv_id_created_idx" ON "cv_version" USING btree ("cv_id","created_at");