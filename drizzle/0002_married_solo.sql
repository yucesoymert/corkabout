CREATE TABLE "card_group" (
	"id" uuid PRIMARY KEY NOT NULL,
	"board_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "card_group" ADD CONSTRAINT "card_group_board_id_board_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."board"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_group_board_idx" ON "card_group" USING btree ("board_id");--> statement-breakpoint
ALTER TABLE "card" ADD CONSTRAINT "card_group_id_card_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."card_group"("id") ON DELETE set null ON UPDATE no action;