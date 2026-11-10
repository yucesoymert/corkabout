"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signOut } from "@/auth";
import { db } from "@/db";
import { boards, cards } from "@/db/schema";
import { requireBoard, requireUser } from "@/lib/auth-guard";

// Session + validation at the trust boundary. Card actions return false instead of throwing,
// the board shows a "couldn't save" toast and keeps the local state.

const coord = z.number().int().min(-1_000_000).max(1_000_000);
const cardFields = z.object({
  title: z.string().max(1_000),
  body: z.string().max(50_000),
  tag: z.string().trim().max(40).nullable(),
  x: coord,
  y: coord,
  width: z.number().int().min(160).max(1_200),
  z: z.number().int().min(0).max(1_000_000_000),
});
const newCard = cardFields.extend({ id: z.uuid() });
const boardTitle = z.string().trim().min(1).max(120);

const ownBoards = (userId: string) => db.select({ id: boards.id }).from(boards).where(eq(boards.userId, userId));

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function createBoardAction(title: string) {
  const user = await requireUser();
  const [board] = await db.insert(boards).values({ userId: user.id, title: boardTitle.parse(title) }).returning({ id: boards.id });
  redirect(`/b/${board.id}`); // the proxy adds the locale
}

export async function renameBoardAction(id: string, title: string) {
  const board = await requireBoard(id);
  const parsed = boardTitle.safeParse(title);
  if (!parsed.success) return false;
  await db.update(boards).set({ title: parsed.data }).where(eq(boards.id, board.id));
  return true;
}

export async function deleteBoardAction(id: string) {
  const board = await requireBoard(id);
  await db.delete(boards).where(eq(boards.id, board.id)); // cards go with it (on delete cascade)
  refresh(); // only called from the dashboard, so re-render it in place
}

/** Also used by "undo" after a delete: the client sends the whole card back with its old id. */
export async function createCardAction(boardId: string, card: z.input<typeof newCard>) {
  const board = await requireBoard(boardId);
  const parsed = newCard.safeParse(card);
  if (!parsed.success) return false;
  await db.insert(cards).values({ ...parsed.data, boardId: board.id }).onConflictDoNothing();
  return true;
}

export async function updateCardAction(id: string, patch: Partial<z.input<typeof cardFields>>) {
  const user = await requireUser();
  const parsed = cardFields.partial().safeParse(patch);
  if (!parsed.success || !z.uuid().safeParse(id).success) return false;
  if (!Object.keys(parsed.data).length) return true;
  const rows = await db
    .update(cards)
    .set(parsed.data)
    .where(and(eq(cards.id, id), inArray(cards.boardId, ownBoards(user.id))))
    .returning({ id: cards.id });
  return rows.length > 0;
}

export async function deleteCardAction(id: string) {
  const user = await requireUser();
  if (!z.uuid().safeParse(id).success) return false;
  await db.delete(cards).where(and(eq(cards.id, id), inArray(cards.boardId, ownBoards(user.id))));
  return true;
}
