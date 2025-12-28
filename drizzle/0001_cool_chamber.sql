CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"time" timestamp with time zone DEFAULT now() NOT NULL,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"engine_id" text
);
--> statement-breakpoint
ALTER TABLE "telemetry" ADD COLUMN "vibration" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "telemetry" ADD COLUMN "gas_pressure" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_engine_id_engines_id_fk" FOREIGN KEY ("engine_id") REFERENCES "public"."engines"("id") ON DELETE no action ON UPDATE no action;