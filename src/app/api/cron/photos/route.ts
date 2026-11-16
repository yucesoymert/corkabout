import { del, list } from "@vercel/blob";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { cards } from "@/db/schema";

const KEEP_DAYS = 7; // a deleted photo card can still come back with undo (kept in localStorage), so its file stays a while

// Daily (vercel.json): deletes uploaded photos no card uses any more, i.e. deleted cards and uploads that never became a card.
// Vercel sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response(null, { status: 401 });
  const before = Date.now() - KEEP_DAYS * 864e5;
  let deleted = 0;
  let cursor: string | undefined;
  // ponytail: one page (1,000 files) and one query at a time; fine for this store, batch the deletes if it grows a lot
  do {
    const page = await list({ prefix: "photos/", cursor, limit: 1_000 });
    cursor = page.cursor;
    const old = page.blobs.filter((b) => b.uploadedAt.getTime() < before).map((b) => b.url);
    if (!old.length) continue;
    const used = new Set((await db.select({ image: cards.image }).from(cards).where(inArray(cards.image, old))).map((r) => r.image));
    const orphans = old.filter((u) => !used.has(u));
    if (orphans.length) await del(orphans);
    deleted += orphans.length;
  } while (cursor);
  return Response.json({ deleted });
}
