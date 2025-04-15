CREATE TABLE IF NOT EXISTS "media" (
	"jellyseerr_id" integer NOT NULL,
	"thread_id" varchar(255) NOT NULL,
	"last_state" json DEFAULT '{}'::json,
	CONSTRAINT "media_jellyseerr_id_thread_id_pk" PRIMARY KEY("jellyseerr_id","thread_id"),
	CONSTRAINT "media_jellyseerr_id_unique" UNIQUE("jellyseerr_id"),
	CONSTRAINT "media_thread_id_unique" UNIQUE("thread_id")
);
