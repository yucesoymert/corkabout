import { eq } from "drizzle-orm";
import type { Viewport } from "next";
import { Suspense } from "react";
import { Board } from "@/components/board";
import { db } from "@/db";
import { cardGroups, cards } from "@/db/schema";
import { getDictionary, getLocale } from "@/i18n";
import { requireBoard, requireUser } from "@/lib/auth-guard";

// The canvas has its own pinch zoom; the browser's page zoom on top of it would fight it (and zoom the top bar).
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };

export default function BoardPage({ params }: PageProps<"/[lang]/b/[id]">) {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <BoardLoader params={params} />
    </Suspense>
  );
}

async function BoardLoader({ params }: { params: PageProps<"/[lang]/b/[id]">["params"] }) {
  const { id } = await params;
  const [board, user, t, locale] = await Promise.all([requireBoard(id), requireUser(), getDictionary(), getLocale()]);
  const [rows, groups] = await Promise.all([
    db
      .select({ id: cards.id, title: cards.title, body: cards.body, tag: cards.tag, x: cards.x, y: cards.y, width: cards.width, z: cards.z, groupId: cards.groupId, marks: cards.marks })
      .from(cards)
      .where(eq(cards.boardId, board.id)),
    db.select({ id: cardGroups.id, title: cardGroups.title, color: cardGroups.color, fill: cardGroups.fill, fillOpacity: cardGroups.fillOpacity }).from(cardGroups).where(eq(cardGroups.boardId, board.id)),
  ]);
  return (
    <Board
      board={{ id: board.id, title: board.title }}
      initialCards={rows}
      initialGroups={groups}
      locale={locale}
      account={{ name: user.name ?? "", email: user.email ?? "", image: user.image ?? null }}
      languages={t.language}
      t={{ ...t.board, focus: t.focus, menu: t.menu }}
    />
  );
}

// Shown right away on navigation (static shell) while the board loads: same top bar spot and a few card ghosts.
function BoardSkeleton() {
  const ghosts = [
    [8, 14, 150],
    [8, 34, 110],
    [30, 14, 190],
    [30, 46, 120],
    [52, 14, 130],
    [74, 14, 170],
  ];
  return (
    <div className="canvas-dots fixed inset-0" style={{ "--dot": "24px", "--dot-x": "0px", "--dot-y": "0px" } as React.CSSProperties} aria-busy>
      <div className="absolute inset-x-3 top-3 flex justify-center">
        <div className="h-9 w-full max-w-xl animate-pulse rounded-full border border-neutral-200 bg-white/90 shadow-sm" />
      </div>
      {ghosts.map(([left, top, height], i) => (
        <div key={i} className="absolute w-[18%] animate-pulse rounded-md bg-white/80 shadow-[0_1px_3px_rgba(0,0,0,.06)]" style={{ left: `${left}%`, top: `${top}%`, height }} />
      ))}
    </div>
  );
}
