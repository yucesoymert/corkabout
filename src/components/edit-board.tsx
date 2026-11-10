"use client";

import { PencilSimple } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { editBoardAction } from "@/app/[lang]/actions";
import type { Dictionary } from "@/i18n/tr";
import { BOARD_ICONS, BOARD_TINTS, ICON_NAMES, TINT_NAMES, type BoardIcon, type BoardTint } from "@/lib/board-look";
import { fill } from "@/lib/format";
import { BoardCover } from "./board-cover";
import { TILE_BUTTON } from "./delete-board";
import { PendingButton } from "./pending-button";

// Pencil on a board tile: name, tint and icon, with a live preview of the cover. Radio inputs, so arrow keys pick.
export function EditBoard({ id, name, icon, color, t }: { id: string; name: string; icon: BoardIcon; color: BoardTint; t: Dictionary["home"] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pick, setPick] = useState({ icon, color });
  const open = () => {
    setPick({ icon, color }); // drop picks from a dialog that was cancelled
    dialog.current?.showModal();
  };

  return (
    <>
      <button onClick={open} aria-label={fill(t.edit, { name })} title={fill(t.edit, { name })} className={`${TILE_BUTTON} hover:text-neutral-900`}>
        <PencilSimple className="size-4" aria-hidden />
      </button>
      <dialog ref={dialog} className="m-auto w-full max-w-md rounded-2xl bg-white p-6 text-neutral-900 backdrop:bg-black/40">
        <h2 className="font-semibold">{t.editTitle}</h2>
        <form
          key={`${name}:${icon}:${color}`}
          action={async (fd) => {
            await editBoardAction(id, fd);
            dialog.current?.close();
          }}
          className="mt-4 flex flex-col gap-5"
        >
          <BoardCover icon={pick.icon} color={pick.color} className="mx-auto w-40" />

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t.name}
            <input name="title" defaultValue={name} required maxLength={120} className="rounded-lg border border-neutral-300 px-3 py-2 font-normal outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900" />
          </label>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t.color}</legend>
            <div className="flex flex-wrap gap-2">
              {TINT_NAMES.map((c) => (
                <label key={c} title={t.colors[c]} className="cursor-pointer">
                  <input type="radio" name="color" value={c} checked={pick.color === c} onChange={() => setPick((p) => ({ ...p, color: c }))} aria-label={t.colors[c]} className="peer sr-only" />
                  <span
                    className="grid size-8 place-items-center rounded-full ring-1 ring-black/10 peer-checked:ring-2 peer-checked:ring-neutral-900 peer-checked:ring-offset-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-neutral-900"
                    style={{ backgroundColor: BOARD_TINTS[c].bg }}
                  >
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: BOARD_TINTS[c].fg }} />
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t.icon}</legend>
            <div className="grid grid-cols-8 gap-1.5">
              {ICON_NAMES.map((i) => {
                const Icon = BOARD_ICONS[i];
                return (
                  <label key={i} title={t.icons[i]} className="cursor-pointer">
                    <input type="radio" name="icon" value={i} checked={pick.icon === i} onChange={() => setPick((p) => ({ ...p, icon: i }))} aria-label={t.icons[i]} className="peer sr-only" />
                    <span className="grid aspect-square place-items-center rounded-lg text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-100 peer-checked:bg-neutral-900 peer-checked:text-white peer-checked:ring-neutral-900 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-neutral-900">
                      <Icon weight="duotone" className="size-5" aria-hidden />
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => dialog.current?.close()} className="rounded-full px-4 py-2 text-sm font-medium hover:bg-neutral-100">
              {t.cancel}
            </button>
            <PendingButton className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-70">{t.save}</PendingButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
