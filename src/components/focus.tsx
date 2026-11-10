"use client";

import { ArrowLeft, ArrowRight, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/tr";
import type { CardData } from "./board";

// Flashcard mode from the old interview page: title first, Space shows the body. Native <dialog> gives Esc and the focus trap.
export function Focus({ cards, t, untitled, onClose }: { cards: CardData[]; t: Dictionary["focus"]; untitled: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const article = useRef<HTMLElement>(null);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const card = cards[i];

  useEffect(() => {
    dialog.current?.showModal();
    article.current?.focus(); // not a button, so Space doesn't click one
  }, []);

  const go = (d: number) => {
    setI((n) => (n + d + cards.length) % cards.length);
    setRevealed(false);
  };

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onKeyDown={(e) => {
        if (!card) return;
        if (e.key === "ArrowRight") go(1);
        else if (e.key === "ArrowLeft") go(-1);
        else if (e.key === " ") {
          e.preventDefault();
          setRevealed((r) => !r);
        }
      }}
      className="m-0 h-full max-h-none w-full max-w-none flex-col items-center justify-center bg-neutral-100 p-6 backdrop:bg-transparent open:flex"
    >
      <button onClick={() => dialog.current?.close()} aria-label={t.close} title={t.close} className="absolute top-5 right-6 grid size-10 place-items-center rounded-full text-neutral-500 hover:bg-white hover:text-neutral-900">
        <X className="size-6" aria-hidden />
      </button>
      {card ? (
        <>
          <article ref={article} tabIndex={-1} aria-live="polite" className="max-h-[78vh] w-full max-w-[720px] overflow-y-auto rounded-lg bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,.12)] outline-none sm:p-12">
            {card.tag && <p className="mb-3.5 text-xs tracking-[.08em] text-neutral-500 uppercase">{card.tag}</p>}
            <h2 className="mb-6 font-serif text-[28px] leading-tight font-bold whitespace-pre-wrap text-ink">{card.title || untitled}</h2>
            {revealed ? (
              <p className="text-[17px] leading-[1.75] whitespace-pre-wrap text-neutral-700">{card.body}</p>
            ) : (
              <button onClick={() => setRevealed(true)} className="w-full rounded-lg border border-dashed border-neutral-400 bg-neutral-50 p-3.5 text-[15px] text-neutral-500 hover:bg-neutral-100">
                {t.reveal}
              </button>
            )}
          </article>
          <nav className="mt-6 flex items-center gap-5">
            <button onClick={() => go(-1)} aria-label={t.prev} className="grid size-11 place-items-center rounded-full border border-neutral-300 bg-white hover:bg-neutral-50">
              <ArrowLeft className="size-5" aria-hidden />
            </button>
            <span className="min-w-16 text-center text-sm text-neutral-500 tabular-nums">
              {i + 1} / {cards.length}
            </span>
            <button onClick={() => go(1)} aria-label={t.next} className="grid size-11 place-items-center rounded-full border border-neutral-300 bg-white hover:bg-neutral-50">
              <ArrowRight className="size-5" aria-hidden />
            </button>
          </nav>
          <p className="absolute bottom-4 text-xs text-neutral-500">{t.hint}</p>
        </>
      ) : (
        <p className="text-neutral-500">{t.empty}</p>
      )}
    </dialog>
  );
}
