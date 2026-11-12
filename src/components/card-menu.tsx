"use client";

import type { Icon } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";

export type MenuItem = { label: string; Icon: Icon; hint?: string; danger?: boolean; onSelect: () => void };

/** Right-click menu at a screen point. Native popover: light dismiss and Esc for free. */
export function CardMenu({ at, items, onClose }: { at: { x: number; y: number }; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current!;
    el.showPopover();
    // keep it on screen near the right and bottom edges
    el.style.left = `${Math.min(at.x, innerWidth - el.offsetWidth - 8)}px`;
    el.style.top = `${Math.min(at.y, innerHeight - el.offsetHeight - 8)}px`;
    el.querySelector("button")?.focus();
  }, [at]);

  return (
    <div
      ref={ref}
      popover="auto"
      role="menu"
      onToggle={(e) => e.newState === "closed" && onClose()}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-auto m-0 min-w-48 rounded-xl border border-neutral-200 bg-white p-1 text-sm text-neutral-800 shadow-xl"
    >
      {items.map(({ label, Icon, hint, danger, onSelect }) => (
        <button
          key={label}
          role="menuitem"
          onClick={() => {
            ref.current?.hidePopover();
            onSelect();
          }}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left focus-visible:outline-none ${
            danger ? "hover:bg-red-500/10 focus-visible:bg-red-500/10" : "hover:bg-neutral-100 focus-visible:bg-neutral-100"
          }`}
        >
          <Icon className={`size-4 shrink-0 ${danger ? "text-red-500/80" : "text-neutral-500"}`} aria-hidden />
          <span className="flex-1">{label}</span>
          {hint && <kbd className="font-sans text-xs text-neutral-400">{hint}</kbd>}
        </button>
      ))}
    </div>
  );
}
