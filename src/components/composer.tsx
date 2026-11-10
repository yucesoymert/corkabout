"use client";

import { useEffect, useRef } from "react";
import type { Dictionary } from "@/i18n/tr";

export type Draft = { tag: string | null; title: string; body: string };

// New-card form in screen pixels (a <dialog>), so its size doesn't follow the canvas zoom.
// Enter in a one-line field moves on, ⌘/Ctrl+Enter adds, Esc cancels.
export function Composer({ tags, tag, t, onAdd, onClose }: { tags: string[]; tag: string | null; t: Dictionary["board"]; onAdd: (d: Draft) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    dialog.current?.showModal(); // focuses the first field (tag); the title is where typing starts
    (form.current?.elements.namedItem("title") as HTMLInputElement | null)?.focus();
  }, []);

  const submit = () => {
    const fd = new FormData(form.current!);
    const text = (k: string) => String(fd.get(k) ?? "");
    const draft = { tag: text("tag").replace(/\s+/g, " ").trim().slice(0, 40) || null, title: text("title").replace(/\s+/g, " ").trim(), body: text("body").replace(/\s+$/, "") };
    if (draft.title || draft.body) onAdd(draft);
    dialog.current?.close();
  };
  const keys = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter") return;
    const el = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      submit();
    } else if (el.tagName === "INPUT") {
      e.preventDefault();
      (form.current?.elements.namedItem(el.name === "tag" ? "title" : "body") as HTMLElement | null)?.focus();
    }
  };

  const field = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";
  return (
    <dialog ref={dialog} onClose={onClose} aria-label={t.newCard} className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-2xl bg-white p-5 text-neutral-900 shadow-xl backdrop:bg-black/30">
      <form
        ref={form}
        onKeyDown={keys}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-3"
      >
        <h2 className="font-semibold">{t.newCard}</h2>
        <input name="tag" defaultValue={tag ?? ""} list="composer-tags" maxLength={40} placeholder={t.tagPlaceholder} aria-label={t.tagPlaceholder} className={`${field} text-xs tracking-[.08em] uppercase`} />
        <datalist id="composer-tags">
          {tags.map((tg) => (
            <option key={tg} value={tg} />
          ))}
        </datalist>
        <input name="title" maxLength={1_000} placeholder={t.titlePlaceholder} aria-label={t.titlePlaceholder} className={`${field} font-serif text-[17px] font-bold text-ink`} />
        <textarea name="body" rows={7} maxLength={50_000} placeholder={t.bodyPlaceholder} aria-label={t.bodyPlaceholder} className={`${field} resize-y text-sm leading-relaxed`} />
        <div className="flex items-center gap-2">
          <span className="mr-auto hidden text-xs text-neutral-500 sm:inline">{t.composerHint}</span>
          <span className="mr-auto sm:hidden" />
          <button type="button" onClick={() => dialog.current?.close()} className="rounded-full px-4 py-2 text-sm font-medium hover:bg-neutral-100">
            {t.cancel}
          </button>
          <button className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700">{t.add}</button>
        </div>
      </form>
    </dialog>
  );
}
