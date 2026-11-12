"use server";

import { and, count, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signOut } from "@/auth";
import { db } from "@/db";
import { boards, cards, users } from "@/db/schema";
import { requireBoard, requireUser } from "@/lib/auth-guard";
import { ICON_NAMES, TINT_NAMES } from "@/lib/board-look";
import { MAX_BOARDS, MAX_CARDS } from "@/lib/limits";

// Session + validation at the trust boundary. Card actions return false instead of throwing,
// the board shows a "couldn't save" toast and keeps the local state.

const coord = z.number().int().min(-1_000_000).max(1_000_000);
const cardFields = z.object({
  title: z.string().max(1_000),
  body: z.string().max(10_000),
  tag: z.string().trim().max(40).nullable(),
  x: coord,
  y: coord,
  width: z.number().int().min(160).max(1_200),
  z: z.number().int().min(0).max(1_000_000_000),
});
const newCard = cardFields.extend({ id: z.uuid() });
const boardTitle = z.string().trim().min(1).max(120);

const ownBoards = (userId: string) => db.select({ id: boards.id }).from(boards).where(eq(boards.userId, userId));

// ponytail: count-then-insert, two parallel requests can pass the cap by one; a DB trigger if that ever matters
const boardCount = async (userId: string) => (await db.select({ n: count() }).from(boards).where(eq(boards.userId, userId)))[0].n;
const cardCount = async (userId: string) => (await db.select({ n: count() }).from(cards).where(inArray(cards.boardId, ownBoards(userId))))[0].n;

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

/** Settings → profile: the display name (starts as the Google name). */
export async function updateNameAction(name: string) {
  const user = await requireUser();
  const parsed = z.string().trim().min(1).max(80).safeParse(name);
  if (!parsed.success) return false;
  await db.update(users).set({ name: parsed.data }).where(eq(users.id, user.id));
  return true;
}

export async function createBoardAction(title: string) {
  const user = await requireUser();
  if ((await boardCount(user.id)) >= MAX_BOARDS) redirect("/"); // the dashboard already shows the limit and hides the button
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

const boardCover = z.object({ title: boardTitle, icon: z.enum(ICON_NAMES), color: z.enum(TINT_NAMES) });

/** Edit dialog on the dashboard: name, cover icon and tint. */
export async function editBoardAction(id: string, fd: FormData) {
  const board = await requireBoard(id);
  const parsed = boardCover.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return;
  await db.update(boards).set(parsed.data).where(eq(boards.id, board.id));
  refresh();
}

export async function deleteBoardAction(id: string) {
  const board = await requireBoard(id);
  await db.delete(boards).where(eq(boards.id, board.id)); // cards go with it (on delete cascade)
  refresh(); // only called from the dashboard, so re-render it in place
}

/** Also used by "undo" after a delete: the client sends the whole card back with its old id. "limit" = MAX_CARDS reached. */
export async function createCardAction(boardId: string, card: z.input<typeof newCard>): Promise<boolean | "limit"> {
  const board = await requireBoard(boardId);
  const parsed = newCard.safeParse(card);
  if (!parsed.success) return false;
  if ((await cardCount(board.userId)) >= MAX_CARDS) return "limit";
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

const moves = z.array(z.object({ id: z.uuid(), x: coord, y: coord })).max(5_000);

/** "Tidy" and its undo: many positions at once, in one transaction, only for cards of this board. */
export async function moveCardsAction(boardId: string, list: z.input<typeof moves>) {
  const board = await requireBoard(boardId);
  const parsed = moves.safeParse(list);
  if (!parsed.success) return false;
  // ponytail: one UPDATE per card; fine for hundreds of cards, use UPDATE ... FROM (VALUES ...) past that
  await db.transaction(async (tx) => {
    for (const m of parsed.data) await tx.update(cards).set({ x: m.x, y: m.y }).where(and(eq(cards.id, m.id), eq(cards.boardId, board.id)));
  });
  return true;
}

export async function deleteCardAction(id: string) {
  const user = await requireUser();
  if (!z.uuid().safeParse(id).success) return false;
  await db.delete(cards).where(and(eq(cards.id, id), inArray(cards.boardId, ownBoards(user.id))));
  return true;
}
