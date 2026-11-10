import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { boards } from "@/db/schema";

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
