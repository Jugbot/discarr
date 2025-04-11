DO $$ BEGIN
 CREATE TYPE "public"."media_type" AS ENUM('movie', 'tv');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "media" DROP CONSTRAINT "media_jellyseerr_id_unique";--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "type" "media_type" NOT NULL;