import { Plus, SignOut } from "@phosphor-icons/react/dist/ssr";
import { count, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { BoardCover } from "@/components/board-cover";
import { BoardsSkeleton, NewBoardForm, RememberBoardCount, TILE_GRID } from "@/components/boards-skeleton";
import { DeleteBoard } from "@/components/delete-board";
import { EditBoard } from "@/components/edit-board";
import { PendingButton } from "@/components/pending-button";
import { PinnedTitle } from "@/components/pinned-title";
import { ThemeToggle } from "@/components/theme";
import { db } from "@/db";
import { boards, cards } from "@/db/schema";
import { getDictionary, getLocale, locales } from "@/i18n";
import { requireUser } from "@/lib/auth-guard";
import { boardLook } from "@/lib/board-look";
import { fill } from "@/lib/format";
import { createBoardAction, signOutAction } from "./actions";

export default async function HomePage() {
  const [t, locale] = [await getDictionary(), await getLocale()];
  return (
    <>
      <header className="flex h-16 items-center gap-3 px-6 sm:px-8">
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
        <img src="/icon.svg" alt="" className="size-7" />
        <span className="mr-auto font-semibold tracking-tight">Corkabout</span>
        <nav className="flex gap-3 text-sm text-neutral-500">
          {locales.map((l) => (
            <Link key={l} href={`/${l}`} aria-current={l === locale ? "page" : undefined} className="hover:text-neutral-900 aria-[current=page]:font-semibold aria-[current=page]:text-neutral-900">
              {t.language[l]}
            </Link>
          ))}
        </nav>
        <ThemeToggle label={t.home.theme} />
        <form action={signOutAction}>
          <PendingButton
            aria-label={t.home.signOut}
            title={t.home.signOut}
            icon={<SignOut className="size-4" aria-hidden />}
            className="grid size-8 place-items-center rounded-full text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
          />
        </form>
      </header>

      <main className="mx-auto mt-4 w-full max-w-6xl px-5 pb-10">
        <div className="flex items-center justify-between gap-4">
          <PinnedTitle text={t.home.title} label={t.home.straighten} />
          <NewBoardForm action={createBoardAction.bind(null, t.home.untitled)}>
            <PendingButton
              icon={<Plus weight="bold" className="size-4" aria-hidden />}
              className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 active:scale-[0.98] disabled:opacity-70"
            >
              {t.home.newBoard}
            </PendingButton>
          </NewBoardForm>
        </div>
        <Suspense fallback={<BoardsSkeleton />}>
          <Boards />
        </Suspense>
      </main>
    </>
  );
}

async function Boards() {
  const [user, t, locale] = [await requireUser(), await getDictionary(), await getLocale()];
  const edited = sql<Date>`greatest(${boards.updatedAt}, max(${cards.updatedAt}))`.mapWith(boards.updatedAt);
  const rows = await db
    .select({ id: boards.id, title: boards.title, icon: boards.icon, color: boards.color, cards: count(cards.id), edited })
    .from(boards)
    .leftJoin(cards, eq(cards.boardId, boards.id))
    .where(eq(boards.userId, user.id))
    .groupBy(boards.id)
    .orderBy(desc(edited));

  if (!rows.length) {
    return (
      <>
      <RememberBoardCount n={0} />
      <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-12 text-center">
        <p className="font-semibold">{t.home.emptyTitle}</p>
        <p className="mt-1 text-sm text-neutral-500">{t.home.emptyBody}</p>
      </div>
      </>
    );
  }

  return (
    <ul className={TILE_GRID}>
      <RememberBoardCount n={rows.length} />
      {rows.map((b) => {
        const { icon, color } = boardLook(b);
        return (
          <li key={b.id} className="group relative">
            <Link href={`/${locale}/b/${b.id}`} className="block rounded-2xl focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-4 focus-visible:ring-offset-paper focus-visible:outline-none">
              <BoardCover icon={icon} color={color} className="transition group-hover:-translate-y-0.5 group-hover:shadow-md" />
              <p className="mt-2 truncate text-sm font-medium sm:mt-2.5 sm:text-base">{b.title}</p>
              <p className="truncate text-xs text-neutral-500 sm:text-sm">
                {fill(t.home.cards, { n: b.cards })} · {fill(t.home.edited, { date: b.edited.toLocaleDateString(locale, { day: "numeric", month: "short" }) })}
              </p>
            </Link>
            <div className="absolute top-2 right-2 flex gap-1.5">
              <EditBoard id={b.id} name={b.title} icon={icon} color={color} t={t.home} />
              <DeleteBoard id={b.id} cards={b.cards} name={b.title} t={t.home} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
