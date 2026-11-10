"use client";

import { useEffect, useSyncExternalStore } from "react";

// Phones: two tiles per row; wider screens: as many 220 px+ tiles as fit.
export const TILE_GRID = "mt-5 grid grid-cols-2 gap-x-3 gap-y-4 sm:mt-6 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-5";

// The server can't know how many boards are coming, so the dashboard remembers the last count in this browser.
// ponytail: per browser, not per account; a second account on the same browser sees the first one's count once
const KEY = "corkspace:board-count";

/** Rendered next to the real tiles: stores how many there are for the next skeleton. */
export function RememberBoardCount({ n }: { n: number }) {
  useEffect(() => localStorage.setItem(KEY, String(n)), [n]);
  return null;
}

const noop = () => () => {};
const readCount = () => {
  const n = Number(localStorage.getItem(KEY) ?? 1); // first visit: one tile
  return Number.isInteger(n) && n >= 0 ? Math.min(n, 24) : 1;
};

export function BoardsSkeleton() {
  const n = useSyncExternalStore(noop, readCount, () => null); // null on the server: draw nothing rather than a wrong count
  if (n === null) return null;
  if (n === 0) return <div className="mt-6 h-40 animate-pulse rounded-2xl border border-dashed border-neutral-300" aria-hidden />;
  return (
    <ul className={TILE_GRID} aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <li key={i}>
          <div className="aspect-[4/3] animate-pulse rounded-2xl bg-neutral-200/80" />
          <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-neutral-200/80" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-neutral-200/60" />
        </li>
      ))}
    </ul>
  );
}

/** The "new board" form: counts the board in advance, since the next dashboard visit comes after the board page. */
export function NewBoardForm({ action, children }: { action: () => Promise<void>; children: React.ReactNode }) {
  return (
    <form action={action} onSubmit={() => localStorage.setItem(KEY, String(readCount() + 1))}>
      {children}
    </form>
  );
}
