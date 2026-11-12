"use client";

import { Eraser } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { Dictionary } from "@/i18n/tr";
import { type Color, COLORS, type Kind } from "@/lib/marks";

/** Small toolbar over a text selection in the card being edited: text colours, highlights, clear. */
export function MarkBar({ cardId, t, onApply }: { cardId: string; t: Dictionary["board"]; onApply: (k: Kind | null, c: Color | null) => void }) {
  const [at, setAt] = useState<{ x: number; y: number; below: boolean } | null>(null);

  useEffect(() => {
    const onChange = () => {
      const sel = getSelection();
      const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
      const node = range?.commonAncestorContainer;
      const el = node && (node instanceof Element ? node : node.parentElement);
      const inField = el?.closest(`#card-${cardId} [data-field=title], #card-${cardId} [data-field=body]`);
      if (!range || range.collapsed || !inField) return setAt(null);
      const r = range.getBoundingClientRect();
      const below = r.top < 64; // no room above (top bar): show it under the selection
      setAt({ x: r.left + r.width / 2, y: below ? r.bottom + 8 : r.top - 8, below });
    };
    document.addEventListener("selectionchange", onChange);
    return () => document.removeEventListener("selectionchange", onChange);
  }, [cardId]);

  if (!at) return null;
  const button = "grid size-7 place-items-center rounded-md hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900";
  return (
    <div
      role="toolbar"
      aria-label={t.colors}
      // keep the focus and the selection in the card: no blur, so editing goes on
      onMouseDown={(e) => e.preventDefault()}
      className="fixed z-20 flex items-center gap-0.5 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg"
      style={{ left: at.x, top: at.y, transform: `translate(-50%, ${at.below ? "0" : "-100%"})` }}
    >
      {COLORS.map((c) => (
        <button key={`fg-${c}`} onClick={() => onApply("fg", c)} aria-label={`${t.textColor}: ${t.color[c]}`} title={`${t.textColor}: ${t.color[c]}`} className={button}>
          <span className="font-serif text-[15px] leading-none font-bold" style={{ color: `var(--mark-${c}-fg)` }} aria-hidden>
            A
          </span>
        </button>
      ))}
      <span className="mx-1 h-5 w-px bg-neutral-200" aria-hidden />
      {COLORS.map((c) => (
        <button key={`hl-${c}`} onClick={() => onApply("hl", c)} aria-label={`${t.highlight}: ${t.color[c]}`} title={`${t.highlight}: ${t.color[c]}`} className={button}>
          <span className="size-4 rounded-full ring-1 ring-black/10" style={{ background: `var(--mark-${c}-hl)` }} aria-hidden />
        </button>
      ))}
      <span className="mx-1 h-5 w-px bg-neutral-200" aria-hidden />
      <button onClick={() => onApply(null, null)} aria-label={t.clearColor} title={t.clearColor} className={`${button} text-neutral-500`}>
        <Eraser className="size-4" aria-hidden />
      </button>
    </div>
  );
}
