"use client";

import { Trash } from "@phosphor-icons/react";
import { useRef } from "react";
import { deleteBoardAction } from "@/app/[lang]/actions";
import type { Dictionary } from "@/i18n/tr";
import { fill } from "@/lib/format";
import { PendingButton } from "./pending-button";

/** Round button on the top-right of a board tile, shown on hover or keyboard focus. */
export const TILE_BUTTON = "grid size-8 place-items-center rounded-full bg-white/90 text-neutral-500 opacity-0 shadow-sm transition group-hover:opacity-100 focus-visible:opacity-100";

// Native <dialog>: focus trap, Esc and backdrop come with showModal().
export function DeleteBoard({ id, name, cards, t }: { id: string; name: string; cards: number; t: Dictionary["home"] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        onClick={() => dialog.current?.showModal()}
        aria-label={fill(t.delete, { name })}
        title={fill(t.delete, { name })}
        className={`${TILE_BUTTON} hover:text-red-600`}
      >
        <Trash className="size-4" aria-hidden />
      </button>
      <dialog ref={dialog} className="m-auto w-full max-w-sm rounded-2xl bg-white p-6 text-neutral-900 backdrop:bg-black/40">
        <h2 className="font-semibold">{fill(t.deleteTitle, { name })}</h2>
        <p className="mt-1 text-sm text-neutral-500">{fill(t.deleteBody, { n: cards })}</p>
        <form action={deleteBoardAction.bind(null, id)} className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => dialog.current?.close()} className="rounded-full px-4 py-2 text-sm font-medium hover:bg-neutral-100">
            {t.cancel}
          </button>
          <PendingButton className="flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70">{t.confirmDelete}</PendingButton>
        </form>
      </dialog>
    </>
  );
}
