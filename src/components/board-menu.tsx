"use client";

import { DotsThreeVertical, GearSix, Keyboard, Rows, SignOut, SquaresFour, SortAscending, Columns } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { signOutAction, updateNameAction } from "@/app/[lang]/actions";
import type { Dictionary } from "@/i18n/tr";
import type { Locale } from "@/i18n/locales";
import { ThemePicker } from "./theme";

export type Arrangement = "tagColumns" | "tagRows" | "gridByTag" | "gridByTitle";
export type Account = { name: string; email: string; image: string | null };
type T = Dictionary["menu"];

/** Apple keyboard? Keys are written as symbols there (⌘ ⇧ ⌫ ↵), as words elsewhere. The server renders Apple, the browser corrects it. */
export const useApple = () => useSyncExternalStore(() => () => {}, () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent), () => true);
const PC: Record<string, string> = { "⌘": "Ctrl", "⇧": "Shift", "⌫": "Backspace", "↵": "Enter" };
const rank = (k: string) => ["Ctrl", "Shift"].indexOf(k) + 1 || 3; // Ctrl+Shift+G, not Shift+Ctrl+G
/** Keys as printed on this keyboard; `hint` joins them for a menu: ⇧⌘G or Ctrl+Shift+G. */
export const keyLabels = (keys: string[], apple: boolean) => (apple ? keys : keys.map((k) => PC[k] ?? k).sort((a, b) => rank(a) - rank(b)));
export const hint = (keys: string[], apple: boolean) => keyLabels(keys, apple).join(apple ? "" : "+");

export const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || el.matches("input, textarea, select"));

const ARRANGEMENTS: { id: Arrangement; Icon: typeof Columns }[] = [
  { id: "tagColumns", Icon: Columns },
  { id: "tagRows", Icon: Rows },
  { id: "gridByTag", Icon: SquaresFour },
  { id: "gridByTitle", Icon: SortAscending },
];

// Every shortcut of the board (board.tsx key handler, composer.tsx, focus.tsx). Keys are kbd chips; a "keys"
// entry names a word from t.keys (Space, click...). Off Apple devices ⌘ ⇧ ⌫ ↵ read Ctrl Shift Backspace Enter (keyLabels).
type K = keyof T["keys"];
const SHORTCUTS: [K, [(string | { w: K })[], K][]][] = [
  ["cards", [
    [[{ w: "doubleClick" }], "newCard"],
    [["⌘", "↵"], "addCard"],
    [["↵"], "edit"],
    [["↵"], "nextField"],
    [["Esc"], "stopEditing"],
    [["⌘", "D"], "duplicate"],
    [["⌫"], "delete"],
    [["←", "↑", "→", "↓"], "move"],
    [["⇧", "←", "↑", "→", "↓"], "moveFar"],
  ]],
  ["selection", [
    [["⌘", "A"], "selectAll"],
    [["Esc"], "clear"],
    [["⇧", { w: "click" }], "toggle"],
    [[{ w: "dragEmpty" }], "marquee"],
    [["Tab"], "nextCard"],
  ]],
  ["groups", [
    [["⌘", "G"], "group"],
    [["⇧", "⌘", "G"], "ungroup"],
  ]],
  ["board", [
    [["⌘", "Z"], "undo"],
    [[{ w: "space" }, { w: "drag" }], "pan"],
    [[{ w: "wheel" }], "scroll"],
    [["⌘", { w: "wheel" }], "zoom"],
  ]],
  ["focus", [
    [["←", "→"], "prevNext"],
    [[{ w: "space" }], "reveal"],
    [["L"], "listen"],
    [["Esc"], "exit"],
  ]],
  ["menu", [
    [["M"], "openMenu"],
    [["1", "2", "3", "4"], "arrangeKeys"],
    [["?"], "shortcutsKey"],
    [[","], "settingsKey"],
  ]],
];

// Top-right "⋯" of a board. Native popover (light dismiss + Esc for free) and a native <dialog> for settings.
export function BoardMenu({ account, boardId, locale, languages, t, onArrange }: { account: Account; boardId: string; locale: Locale; languages: Record<Locale, string>; t: T; onArrange: (a: Arrangement) => void }) {
  const menu = useRef<HTMLDivElement>(null);
  const settings = useRef<HTMLDialogElement>(null);
  const shortcuts = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(account.name);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const apple = useApple();
  const themeLabels = { light: t.light, dark: t.dark, system: t.system };
  const item = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900";
  const kbd = "min-w-6 rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-center font-sans text-xs text-neutral-600 shadow-[0_1px_0_var(--color-neutral-200)]";
  const chip = (k: string) => <kbd className={`ml-auto ${kbd}`}>{k}</kbd>;

  const arrange = (a: Arrangement) => {
    menu.current?.hidePopover();
    onArrange(a);
  };
  const openShortcuts = () => {
    menu.current?.hidePopover();
    shortcuts.current?.showModal();
    shortcuts.current?.querySelector("[data-list]")?.scrollTo(0, 0);
  };
  const openSettings = () => {
    menu.current?.hidePopover();
    setSaved("idle");
    settings.current?.showModal();
  };
  // M opens the menu, 1-4 pick a layout while it is open, ? and , open their dialogs. Not while typing or in a dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target) || document.querySelector("dialog[open]")) return;
      const open = menu.current?.matches(":popover-open");
      const a = open ? ARRANGEMENTS[Number(e.key) - 1] : undefined; // Number("x") is NaN: no entry
      if (a) arrange(a.id);
      else if (e.key.toLowerCase() === "m") menu.current?.togglePopover();
      else if (e.key === "?") openShortcuts();
      else if (e.key === ",") openSettings();
      else return;
      e.preventDefault();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

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
        title={`${t.open} (M)`}
        aria-keyshortcuts="M"
        className="fixed top-3 right-3 z-10 grid size-9 place-items-center rounded-full border border-neutral-200 bg-white/90 text-neutral-600 shadow-sm backdrop-blur hover:text-neutral-900"
      >
        <DotsThreeVertical weight="bold" className="size-4" aria-hidden />
      </button>

      <div ref={menu} id="board-menu" popover="auto" className="fixed inset-auto top-14 right-3 m-0 w-72 rounded-2xl border border-neutral-200 bg-white p-2 text-neutral-900 shadow-xl">
        <p className="px-2.5 pt-1 pb-1.5 text-xs font-medium text-neutral-500">{t.arrange}</p>
        {ARRANGEMENTS.map(({ id, Icon }, i) => (
          <button key={id} className={item} onClick={() => arrange(id)} aria-keyshortcuts={String(i + 1)}>
            <Icon className="size-4 shrink-0 text-neutral-500" aria-hidden />
            {t[id]}
            {chip(String(i + 1))}
          </button>
        ))}

        <div className="my-2 h-px bg-neutral-200" />
        <p className="px-2.5 pb-1.5 text-xs font-medium text-neutral-500">{t.theme}</p>
        <div className="px-1">
          <ThemePicker labels={themeLabels} />
        </div>

        <div className="my-2 h-px bg-neutral-200" />
        <button className={item} onClick={openShortcuts} aria-keyshortcuts="?">
          <Keyboard className="size-4 shrink-0 text-neutral-500" aria-hidden />
          {t.shortcuts}
          {chip("?")}
        </button>
        <button className={item} onClick={openSettings} aria-keyshortcuts=",">
          <GearSix className="size-4 shrink-0 text-neutral-500" aria-hidden />
          {t.settings}
          {chip(",")}
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

      {/* Fixed title and footer, only the list scrolls. A click on the backdrop lands on the <dialog> itself (it has no
          padding of its own) and closes it. */}
      <dialog
        ref={shortcuts}
        aria-labelledby="shortcuts-title"
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="m-auto max-h-[min(40rem,calc(100dvh-2rem))] w-[min(28rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-white p-0 text-neutral-900 backdrop:bg-black/40 open:flex"
      >
        <h2 id="shortcuts-title" className="px-6 pt-5 pb-0 font-semibold">
          {t.shortcuts}
        </h2>
        <div data-list className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 outline-none [scrollbar-color:var(--color-neutral-300)_transparent] [scrollbar-width:thin]">
          {SHORTCUTS.map(([section, rows]) => (
            <section key={section}>
              <h3 className="sticky top-0 -mx-6 bg-white px-6 pt-4 pb-2 text-[11px] font-semibold tracking-wider text-neutral-900 uppercase">{t.keys[section]}</h3>
              <dl className="divide-y divide-neutral-100 rounded-lg border border-neutral-100 px-3 text-sm">
                {rows.map(([keys, label], i) => (
                  <div key={i} className="flex items-center justify-between gap-4 py-1.5">
                    <dt className="text-neutral-700">{t.keys[label]}</dt>
                    <dd className="flex shrink-0 gap-1">
                      {keyLabels(keys.map((k) => (typeof k === "string" ? k : t.keys[k.w])), apple).map((k, j) => (
                        <kbd key={j} className={kbd}>
                          {k}
                        </kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <div className="flex justify-end px-6 py-3">
          <button onClick={() => shortcuts.current?.close()} className="rounded-full px-4 py-2 text-sm font-medium hover:bg-neutral-100">
            {t.close}
          </button>
        </div>
      </dialog>

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
