import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Mark } from "@/lib/marks";

// ===== Auth.js (@auth/drizzle-adapter default shape) =====
export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// ===== App =====
const updatedAt = () => timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date());

export const boards = pgTable(
  "board",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    icon: text("icon"), // cover icon and tint names from src/lib/board-look.ts; null = picked from the id
    color: text("color"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: updatedAt(),
  },
  (t) => [index("board_user_idx").on(t.userId)],
);

// A named frame around some cards of a board. It has no position of its own: the frame is drawn around its cards.
export const cardGroups = pgTable(
  "card_group",
  {
    id: uuid("id").primaryKey(), // made in the browser, like card ids
    boardId: uuid("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    updatedAt: updatedAt(),
  },
  (t) => [index("card_group_board_idx").on(t.boardId)],
);

// Positions are world pixels on the board's canvas; z is the stacking order (higher = on top).
export const cards = pgTable(
  "card",
  {
    id: uuid("id").primaryKey(), // made in the browser, so a new card can be edited before the insert returns
    boardId: uuid("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    body: text("body").notNull().default(""),
    tag: text("tag"), // the filter chip in the board's top bar
    marks: jsonb("marks").$type<Mark[]>().notNull().default([]), // coloured parts of title/body, see src/lib/marks.ts
    groupId: uuid("group_id").references(() => cardGroups.id, { onDelete: "set null" }), // ungrouping deletes the group row
    x: integer("x").notNull(),
    y: integer("y").notNull(),
    width: integer("width").notNull(),
    z: integer("z").notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [index("card_board_idx").on(t.boardId)],
);
