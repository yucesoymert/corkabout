ALTER TABLE "card_group" ADD COLUMN "color" text;--> statement-breakpoint
ALTER TABLE "card_group" ADD COLUMN "fill" boolean DEFAULT false NOT NULL;