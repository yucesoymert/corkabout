// One-off: turns the cards of the old page (legacy/interview.html) into an "Interview" board, one column per category.
// Usage: pnpm seed --email you@gmail.com   (sign in once with Google first)
// Local test user: pnpm seed --email test@corkspace.test --create-user   (see src/app/api/dev/login)
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";

type OldCard = { cat: string; q: string; a: string };

const WIDTH = 300;
const GAP = 24;
const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

// ponytail: card height guessed from text length (~42 chars per line at 300 px); a short guess overlaps, drag to tidy
const estimateHeight = (c: OldCard) => {
  const lines = (s: string, perLine: number) => s.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / perLine)), 0);
  return 40 + 18 + lines(c.q, 32) * 21 + 8 + lines(c.a, 40) * 21;
};

/** x/y for every card: categories become columns, cards stack in their original order. */
function layout(old: OldCard[]) {
  const cats = [...new Set(old.map((c) => c.cat))];
  const bottoms = cats.map(() => 0);
  return old.map((c) => {
    const col = cats.indexOf(c.cat);
    const y = bottoms[col];
    bottoms[col] += estimateHeight(c) + GAP;
    return { tag: c.cat, title: decode(c.q), body: decode(c.a), x: col * (WIDTH + 2 * GAP), y, width: WIDTH, z: 0 };
  });
}

async function main() {
  const { db } = await import("../src/db"); // after dotenv, so DATABASE_URL is set
  const { boards, cards, users } = await import("../src/db/schema");

  const { email, "create-user": createUser } = parseArgs({ options: { email: { type: "string" }, "create-user": { type: "boolean" } } }).values;
  if (!email) throw new Error("--email is required");
  let user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user && createUser) [user] = await db.insert(users).values({ email, name: "Test User" }).returning();
  if (!user) throw new Error(`${email} not found. Sign in once with Google first.`);

  const html = await readFile("legacy/interview.html", "utf8");
  const src = html.match(/const CARDS = (\[[\s\S]*?\n\]);/)?.[1];
  if (!src) throw new Error("CARDS array not found in legacy/interview.html");
  const old: OldCard[] = new Function(`return ${src}`)(); // our own file, not user input

  const [board] = await db.insert(boards).values({ userId: user.id, title: "Interview" }).returning();
  await db.insert(cards).values(layout(old).map((c) => ({ ...c, id: crypto.randomUUID(), boardId: board.id })));
  console.log(`Board ${board.id}: ${old.length} cards`);
  process.exit(0);
}

main();
