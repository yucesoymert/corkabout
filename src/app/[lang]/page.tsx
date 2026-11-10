import {
  BookOpenText,
  Brain,
  Briefcase,
  Coffee,
  Compass,
  Globe,
  Leaf,
  Lightbulb,
  MusicNotes,
  Notebook,
  Palette,
  Planet,
  Plus,
  PuzzlePiece,
  Rocket,
  SignOut,
  Sparkle,
  Translate,
} from "@phosphor-icons/react/dist/ssr";
import { count, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { DeleteBoard } from "@/components/delete-board";
import { PendingButton } from "@/components/pending-button";
import { db } from "@/db";
import { boards, cards } from "@/db/schema";
import { getDictionary, getLocale, locales } from "@/i18n";
import { requireUser } from "@/lib/auth-guard";
import { fill } from "@/lib/format";
import { createBoardAction, signOutAction } from "./actions";

// A board without its own picture gets an icon and a tint picked from its id: random per board, the same on every visit.
// ponytail: no icon/photo column yet; add one (and a picker) when boards can choose their own
const ICONS = [BookOpenText, Brain, Briefcase, Coffee, Compass, Globe, Leaf, Lightbulb, MusicNotes, Notebook, Palette, Planet, PuzzlePiece, Rocket, Sparkle, Translate];
const TINTS = [
  { bg: "#dbe7f3", fg: "#3d6a99" }, // sky
  { bg: "#dde9dc", fg: "#4a7a4f" }, // sage
  { bg: "#f6dfcf", fg: "#a5592f" }, // peach
  { bg: "#e5def3", fg: "#6a4f9c" }, // lavender
  { bg: "#f3dbe0", fg: "#a2445b" }, // rose
  { bg: "#f2e8c4", fg: "#8a6d1c" }, // butter
  { bg: "#d5ebe8", fg: "#2f7a72" }, // teal
];
const boardLook = (id: string) => {
  const n = parseInt(id.slice(0, 8), 16); // uuid v4: these hex digits are random
  return { Icon: ICONS[n % ICONS.length], tint: TINTS[Math.floor(n / ICONS.length) % TINTS.length] };
};

const TILE_GRID = "mt-6 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5";

export default async function HomePage() {
  const [t, locale] = [await getDictionary(), await getLocale()];
  return (
    <>
      <header className="flex h-14 items-center gap-3 px-4 sm:px-5">
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
          <h1 className="text-2xl font-semibold tracking-tight">{t.home.title}</h1>
          <form action={createBoardAction.bind(null, t.home.untitled)}>
            <PendingButton
              icon={<Plus weight="bold" className="size-4" aria-hidden />}
              className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 active:scale-[0.98] disabled:opacity-70"
            >
              {t.home.newBoard}
            </PendingButton>
          </form>
        </div>
        <Suspense fallback={<BoardsSkeleton />}>
          <Boards />
        </Suspense>
      </main>
    </>
  );
}

function BoardsSkeleton() {
  return (
    <ul className={TILE_GRID} aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i}>
          <div className="aspect-[4/3] animate-pulse rounded-2xl bg-neutral-200/80" />
          <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-neutral-200/80" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-neutral-200/60" />
        </li>
      ))}
    </ul>
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
      <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-12 text-center">
        <p className="font-semibold">{t.home.emptyTitle}</p>
        <p className="mt-1 text-sm text-neutral-500">{t.home.emptyBody}</p>
      </div>
    );
  }

  return (
    <ul className={TILE_GRID}>
      {rows.map((b) => {
        const { Icon, tint } = boardLook(b.id);
        return (
          <li key={b.id} className="group relative">
            <Link href={`/${locale}/b/${b.id}`} className="block rounded-2xl focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-4 focus-visible:ring-offset-paper focus-visible:outline-none">
              <div
                className="grid aspect-[4/3] place-items-center rounded-2xl shadow-sm ring-1 ring-black/5 transition group-hover:-translate-y-0.5 group-hover:shadow-md"
                style={{ backgroundColor: tint.bg, color: tint.fg }}
                aria-hidden
              >
                <span className="grid size-16 place-items-center rounded-2xl bg-white/70 shadow-sm">
                  <Icon weight="duotone" className="size-8" />
                </span>
              </div>
              <p className="mt-2.5 truncate font-medium">{b.title}</p>
              <p className="text-sm text-neutral-500">
                {fill(t.home.cards, { n: b.cards })} · {fill(t.home.edited, { date: b.edited.toLocaleDateString(locale, { day: "numeric", month: "short" }) })}
              </p>
            </Link>
            <DeleteBoard id={b.id} cards={b.cards} name={b.title} t={t.home} />
          </li>
        );
      })}
    </ul>
  );
}
