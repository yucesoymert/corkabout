import { eq } from "drizzle-orm";
import { Suspense } from "react";
import { Board } from "@/components/board";
import { db } from "@/db";
import { cards } from "@/db/schema";
import { getDictionary, getLocale } from "@/i18n";
import { requireBoard } from "@/lib/auth-guard";

export default function BoardPage({ params }: PageProps<"/[lang]/b/[id]">) {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-paper" />}>
      <BoardLoader params={params} />
    </Suspense>
  );
}

async function BoardLoader({ params }: { params: PageProps<"/[lang]/b/[id]">["params"] }) {
  const { id } = await params;
  const [board, t, locale] = await Promise.all([requireBoard(id), getDictionary(), getLocale()]);
  const rows = await db
    .select({ id: cards.id, title: cards.title, body: cards.body, tag: cards.tag, x: cards.x, y: cards.y, width: cards.width, z: cards.z })
    .from(cards)
    .where(eq(cards.boardId, board.id));
  return <Board board={{ id: board.id, title: board.title }} initialCards={rows} locale={locale} t={{ ...t.board, focus: t.focus }} />;
}
