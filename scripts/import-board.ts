// Adds a board from a JSON file: { title, icon?, color?, cards: [{ tag, title, answer }] }. One column per tag.
// Usage: pnpm import-board ~/Documents/corkabout-boards/board.json --email you@gmail.com   (sign in once with Google first)
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { layout } from "./layout";

const file = z.object({
  title: z.string().trim().min(1).max(120),
  icon: z.string().optional(), // names from src/lib/board-look.ts; unknown names fall back to the id's pick
  color: z.string().optional(),
  cards: z.array(z.object({ tag: z.string().trim().min(1).max(40), title: z.string().max(1_000), answer: z.string().max(50_000) })).min(1),
});

async function main() {
  const { db } = await import("../src/db"); // after dotenv, so DATABASE_URL is set
  const { boards, cards, users } = await import("../src/db/schema");

  const { values, positionals } = parseArgs({ options: { email: { type: "string" } }, allowPositionals: true });
  const [path] = positionals;
  if (!path || !values.email) throw new Error("Usage: pnpm import-board <file.json> --email you@gmail.com");
  const data = file.parse(JSON.parse(await readFile(path, "utf8")));

  const user = await db.query.users.findFirst({ where: eq(users.email, values.email) });
  if (!user) throw new Error(`${values.email} not found. Sign in once with Google first.`);

  const [board] = await db.insert(boards).values({ userId: user.id, title: data.title, icon: data.icon, color: data.color }).returning();
  const list = data.cards.map((c) => ({ tag: c.tag, title: c.title, body: c.answer }));
  await db.insert(cards).values(layout(list).map((c) => ({ ...c, id: crypto.randomUUID(), boardId: board.id })));
  console.log(`Board "${board.title}" (${board.id}): ${list.length} cards`);
  process.exit(0);
}

main();
