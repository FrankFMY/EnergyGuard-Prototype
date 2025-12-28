CREATE TYPE "public"."status" AS ENUM('ok', 'warning', 'error');--> statement-breakpoint
CREATE TABLE "engines" (
	"id" text PRIMARY KEY NOT NULL,
	"model" text NOT NULL,
	"status" "status" DEFAULT 'ok' NOT NULL,
	"total_hours" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry" (
	"time" timestamp with time zone DEFAULT now() NOT NULL,
	"engine_id" text NOT NULL,
	"power_kw" double precision NOT NULL,
	"temp_exhaust" double precision NOT NULL,
	"gas_consumption" double precision NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telemetry" ADD CONSTRAINT "telemetry_engine_id_engines_id_fk" FOREIGN KEY ("engine_id") REFERENCES "public"."engines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
SELECT create_hypertable('telemetry', 'time');
