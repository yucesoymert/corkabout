"use client";

import { DotsThreeVertical, GearSix, Rows, SignOut, SquaresFour, SortAscending, Columns } from "@phosphor-icons/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { signOutAction, updateNameAction } from "@/app/[lang]/actions";
import type { Dictionary } from "@/i18n/tr";
import type { Locale } from "@/i18n/locales";
import { ThemePicker } from "./theme";

export type Arrangement = "tagColumns" | "tagRows" | "gridByTag" | "gridByTitle";
export type Account = { name: string; email: string; image: string | null };
type T = Dictionary["menu"];

const ARRANGEMENTS: { id: Arrangement; Icon: typeof Columns }[] = [
  { id: "tagColumns", Icon: Columns },
  { id: "tagRows", Icon: Rows },
  { id: "gridByTag", Icon: SquaresFour },
  { id: "gridByTitle", Icon: SortAscending },
];

// Top-right "⋯" of a board. Native popover (light dismiss + Esc for free) and a native <dialog> for settings.
export function BoardMenu({ account, boardId, locale, languages, t, onArrange }: { account: Account; boardId: string; locale: Locale; languages: Record<Locale, string>; t: T; onArrange: (a: Arrangement) => void }) {
  const menu = useRef<HTMLDivElement>(null);
  const settings = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(account.name);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const themeLabels = { light: t.light, dark: t.dark, system: t.system };
  const item = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900";

  const saveName = async (fd: FormData) => {
    const next = String(fd.get("name") ?? "").trim();
    if (!next || next === name) return;
    setSaved("saving");
    const ok = await updateNameAction(next);
    if (ok) setName(next);
    setSaved(ok ? "saved" : "failed");
  };

  return (
    <>
      <button
        popoverTarget="board-menu"
        aria-label={t.open}
        title={t.open}
        className="fixed top-3 right-3 z-10 grid size-9 place-items-center rounded-full border border-neutral-200 bg-white/90 text-neutral-600 shadow-sm backdrop-blur hover:text-neutral-900"
      >
        <DotsThreeVertical weight="bold" className="size-4" aria-hidden />
      </button>

      <div ref={menu} id="board-menu" popover="auto" className="fixed inset-auto top-14 right-3 m-0 w-72 rounded-2xl border border-neutral-200 bg-white p-2 text-neutral-900 shadow-xl">
        <p className="px-2.5 pt-1 pb-1.5 text-xs font-medium text-neutral-500">{t.arrange}</p>
        {ARRANGEMENTS.map(({ id, Icon }) => (
          <button
            key={id}
            className={item}
            onClick={() => {
              menu.current?.hidePopover();
              onArrange(id);
            }}
          >
            <Icon className="size-4 shrink-0 text-neutral-500" aria-hidden />
            {t[id]}
          </button>
        ))}

        <div className="my-2 h-px bg-neutral-200" />
        <p className="px-2.5 pb-1.5 text-xs font-medium text-neutral-500">{t.theme}</p>
        <div className="px-1">
          <ThemePicker labels={themeLabels} />
        </div>

        <div className="my-2 h-px bg-neutral-200" />
        <button
          className={item}
          onClick={() => {
            menu.current?.hidePopover();
            setSaved("idle");
            settings.current?.showModal();
          }}
        >
          <GearSix className="size-4 shrink-0 text-neutral-500" aria-hidden />
          {t.settings}
        </button>

        <div className="my-2 h-px bg-neutral-200" />
        <div className="flex items-center gap-2.5 px-2.5 py-1.5">
          {account.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- Google avatar, any size; next/image would need the host whitelisted
            <img src={account.image} alt="" referrerPolicy="no-referrer" className="size-8 rounded-full" />
          ) : (
            <span className="grid size-8 place-items-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-700" aria-hidden>
              {(name || account.email).slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-neutral-500">{account.email}</p>
          </div>
          <form action={signOutAction}>
            <button aria-label={t.signOut} title={t.signOut} className="grid size-8 place-items-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900">
              <SignOut className="size-4" aria-hidden />
            </button>
          </form>
        </div>
      </div>

      <dialog ref={settings} aria-labelledby="settings-title" className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl bg-white p-6 text-neutral-900 backdrop:bg-black/40">
        <h2 id="settings-title" className="font-semibold">
          {t.settings}
        </h2>

        <form action={saveName} className="mt-5">
          <label htmlFor="settings-name" className="text-sm font-medium">
            {t.name}
          </label>
          <div className="mt-1.5 flex gap-2">
            <input id="settings-name" name="name" defaultValue={name} required maxLength={80} className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900" />
            <button disabled={saved === "saving"} className="rounded-full bg-neutral-900 px-4 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-60">
              {t.save}
            </button>
          </div>
          <p className="mt-1 h-4 text-xs text-neutral-500" aria-live="polite">
            {saved === "saved" ? t.saved : saved === "failed" ? t.saveFailed : ""}
          </p>
        </form>

        <p className="mt-4 text-sm font-medium">{t.language}</p>
        <nav className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg bg-neutral-100 p-1 text-sm">
          {(Object.keys(languages) as Locale[]).map((l) => (
            <Link
              key={l}
              href={`/${l}/b/${boardId}`}
              aria-current={l === locale ? "true" : undefined}
              className="rounded-md px-2 py-1.5 text-center text-neutral-600 hover:text-neutral-900 aria-[current=true]:bg-white aria-[current=true]:font-medium aria-[current=true]:text-neutral-900 aria-[current=true]:shadow-sm"
            >
              {languages[l]}
            </Link>
          ))}
        </nav>

        <p className="mt-5 text-sm font-medium">{t.theme}</p>
        <div className="mt-1.5">
          <ThemePicker labels={themeLabels} />
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={() => settings.current?.close()} className="rounded-full px-4 py-2 text-sm font-medium hover:bg-neutral-100">
            {t.close}
          </button>
        </div>
      </dialog>
    </>
  );
}
