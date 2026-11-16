import { and, countDistinct, eq, inArray, ne } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { boards, cards, users } from "@/db/schema";
import { photoLimit } from "@/lib/limits";

// Every page and Server Action goes through these: no session → /login (proxy adds the locale), someone else's board → 404.
// Auth.js uses crypto before it reads the cookie; connection() marks the read as request-time
// so it doesn't break prerendering (Cache Components).
export const getSession = cache(async () => {
  await connection();
  return auth();
});

export const requireUser = cache(async () => {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  return session.user as typeof session.user & { id: string };
});

export const requireBoard = cache(async (id: string) => {
  const user = await requireUser();
  if (!z.uuid().safeParse(id).success) notFound();
  const board = await db.query.boards.findFirst({ where: and(eq(boards.id, id), eq(boards.userId, user.id)) });
  if (!board) notFound();
  return board;
});

/** Photos this account keeps (distinct card images: a duplicated card doesn't count twice) and its limit (null = none).
 * `except` leaves one board out, so the board page can add the photos it has on screen itself. */
export async function photoQuota(userId: string, except?: string) {
  const own = db.select({ id: boards.id }).from(boards).where(except ? and(eq(boards.userId, userId), ne(boards.id, except)) : eq(boards.userId, userId));
  const [[{ n }], account] = await Promise.all([
    db.select({ n: countDistinct(cards.image) }).from(cards).where(inArray(cards.boardId, own)),
    db.query.users.findFirst({ where: eq(users.id, userId), columns: { email: true, proUntil: true } }),
  ]);
  return { used: n, limit: photoLimit(account?.email, account?.proUntil ?? null) };
}
