import { Plus, SignOut } from "@phosphor-icons/react/dist/ssr";
import { count, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { DeleteBoard } from "@/components/delete-board";
import { db } from "@/db";
import { boards, cards } from "@/db/schema";
import { getDictionary, getLocale, locales } from "@/i18n";
import { requireUser } from "@/lib/auth-guard";
import { fill } from "@/lib/format";
import { createBoardAction, signOutAction } from "./actions";

export default async function HomePage() {
  const [t, locale] = [await getDictionary(), await getLocale()];
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-4">
      <header className="flex h-10 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
        <img src="/icon.svg" alt="" className="size-7" />
        <span className="mr-auto font-semibold tracking-tight">Corkspace</span>
        <nav className="flex gap-3 text-sm text-neutral-500">
          {locales.map((l) => (
            <Link key={l} href={`/${l}`} aria-current={l === locale ? "page" : undefined} className="hover:text-neutral-900 aria-[current=page]:font-semibold aria-[current=page]:text-neutral-900">
              {t.language[l]}
            </Link>
          ))}
        </nav>
        <form action={signOutAction}>
          <button aria-label={t.home.signOut} title={t.home.signOut} className="grid size-8 place-items-center rounded-full text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900">
            <SignOut className="size-4" aria-hidden />
          </button>
        </form>
      </header>

      <main className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">{t.home.title}</h1>
          <form action={createBoardAction.bind(null, t.home.untitled)}>
            <button className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 active:scale-[0.98]">
              <Plus weight="bold" className="size-4" aria-hidden />
              {t.home.newBoard}
            </button>
          </form>
        </div>
        <Suspense fallback={<div className="mt-6 h-56 animate-pulse rounded-2xl bg-neutral-200/60" />}>
          <Boards />
        </Suspense>
      </main>
    </div>
  );
}

async function Boards() {
  const [user, t, locale] = [await requireUser(), await getDictionary(), await getLocale()];
  const edited = sql<Date>`greatest(${boards.updatedAt}, max(${cards.updatedAt}))`.mapWith(boards.updatedAt);
  const rows = await db
    .select({ id: boards.id, title: boards.title, cards: count(cards.id), edited })
    .from(boards)
    .leftJoin(cards, eq(cards.boardId, boards.id))
    .where(eq(boards.userId, user.id))
    .groupBy(boards.id)
    .orderBy(desc(edited));

  if (!rows.length) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 p-12 text-center">
        <p className="font-semibold">{t.home.emptyTitle}</p>
        <p className="mt-1 text-sm text-neutral-500">{t.home.emptyBody}</p>
      </div>
    );
  }

  return (
    <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
      {rows.map((b) => (
        <li key={b.id} className="group relative">
          <Link href={`/${locale}/b/${b.id}`} className="block rounded-2xl focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-4 focus-visible:ring-offset-paper focus-visible:outline-none">
            <div
              className="canvas-dots aspect-[4/3] rounded-2xl border border-neutral-200 bg-white transition group-hover:-translate-y-0.5 group-hover:shadow-md"
              style={{ "--dot": "14px", "--dot-x": "0px", "--dot-y": "0px" } as React.CSSProperties}
              aria-hidden
            />
            <p className="mt-2.5 truncate font-medium">{b.title}</p>
            <p className="text-sm text-neutral-500">
              {fill(t.home.cards, { n: b.cards })} · {fill(t.home.edited, { date: b.edited.toLocaleDateString(locale, { day: "numeric", month: "short" }) })}
            </p>
          </Link>
          <DeleteBoard id={b.id} cards={b.cards} name={b.title} t={t.home} />
        </li>
      ))}
    </ul>
  );
}
