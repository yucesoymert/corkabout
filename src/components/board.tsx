"use client";

import { ArrowLeft, Cards, Minus, Plus } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createCardAction, deleteCardAction, renameBoardAction, updateCardAction } from "@/app/[lang]/actions";
import type { Dictionary } from "@/i18n/tr";
import { fitView, toWorld, zoomAt, type View } from "@/lib/canvas";
import { fill } from "@/lib/format";
import { Focus } from "./focus";

export type CardData = { id: string; title: string; body: string; tag: string | null; x: number; y: number; width: number; z: number };
type Field = "tag" | "title" | "body";
type Patch = Partial<Omit<CardData, "id">>;
type T = Dictionary["board"] & { focus: Dictionary["focus"] };
type Gesture = { kind: "pan" | "move" | "resize"; id?: string; sx: number; sy: number; ox: number; oy: number; ow: number; z: number; moved: boolean };

const CARD_WIDTH = 300;
const viewKey = (boardId: string) => `corkspace:view:${boardId}`;

function savedView(boardId: string): View | null {
  try {
    const v = JSON.parse(localStorage.getItem(viewKey(boardId)) ?? "null");
    return [v?.x, v?.y, v?.zoom].every(Number.isFinite) ? v : null;
  } catch {
    return null;
  }
}

const patchFor = (g: Gesture, dx: number, dy: number, zoom: number): Patch =>
  g.kind === "move"
    ? { x: Math.round(g.ox + dx / zoom), y: Math.round(g.oy + dy / zoom), z: g.z }
    : { width: Math.round(Math.min(1200, Math.max(160, g.ow + dx / zoom))) };

export function Board({ board, initialCards, locale, t }: { board: { id: string; title: string }; initialCards: CardData[]; locale: string; t: T }) {
  const [cards, setCards] = useState(initialCards);
  const [title, setTitle] = useState(board.title);
  const [view, setView] = useState<View | null>(null); // null until the saved view is read (localStorage is client-only)
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; field: Field } | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [focusOpen, setFocusOpen] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const zoomRef = useRef(1);

  // ponytail: reading order is left-to-right columns, top to bottom; fine for column layouts, odd for scattered boards
  const ordered = useMemo(() => [...cards].sort((a, b) => a.x - b.x || a.y - b.y), [cards]);
  const tags = useMemo(() => [...new Set(ordered.flatMap((c) => (c.tag ? [c.tag] : [])))], [ordered]);
  const activeTag = tag && tags.includes(tag) ? tag : null;
  const matches = (c: CardData) => !activeTag || c.tag === activeTag;
  const maxZ = Math.max(0, ...cards.map((c) => c.z));
  const v = view ?? { x: 0, y: 0, zoom: 1 };

  const failed = () => toast.error(t.saveFailed);
  const call = (p: Promise<boolean>) => p.then((ok) => ok || failed(), failed);
  const save = (id: string, patch: Patch) => {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    call(updateCardAction(id, patch));
  };
  const fit = () => {
    const rects = cards.map((c) => ({ x: c.x, y: c.y, w: c.width, h: document.getElementById(`card-${c.id}`)?.offsetHeight ?? 120 }));
    setView(fitView(rects, innerWidth, innerHeight));
  };

  // Once on mount: the last view of this board, or fit everything in.
  useEffect(() => {
    const saved = savedView(board.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage and card heights only exist after hydration
    if (saved) setView(saved);
    else fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);

  useEffect(() => {
    if (!view) return;
    zoomRef.current = view.zoom;
    const h = setTimeout(() => localStorage.setItem(viewKey(board.id), JSON.stringify(view)), 300);
    return () => clearTimeout(h);
  }, [view, board.id]);

  // Wheel = pan, ⌘/Ctrl+wheel and trackpad pinch = zoom. Native listeners: React's wheel listener is passive (can't preventDefault).
  useEffect(() => {
    const el = viewport.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const k = e.deltaMode === 1 ? 16 : 1; // Firefox mouse wheels report lines
      if (e.ctrlKey || e.metaKey) setView((v) => v && zoomAt(v, e.clientX, e.clientY, v.zoom * Math.exp(-e.deltaY * k * 0.01)));
      else setView((v) => v && { ...v, x: v.x - e.deltaX * k, y: v.y - e.deltaY * k });
    };
    // Safari sends trackpad pinch as gesture events instead of ctrl+wheel
    type Gesture = Event & { scale: number; clientX: number; clientY: number };
    let start = 1;
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      start = zoomRef.current;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const g = e as Gesture;
      setView((v) => v && zoomAt(v, g.clientX, g.clientY, start * g.scale));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGestureStart);
    el.addEventListener("gesturechange", onGestureChange);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
    };
  }, []);

  const add = (x: number, y: number) => {
    const card: CardData = { id: crypto.randomUUID(), title: "", body: "", tag: activeTag, x: Math.round(x), y: Math.round(y), width: CARD_WIDTH, z: maxZ + 1 };
    setCards((cs) => [...cs, card]);
    setSelected(card.id);
    setEditing({ id: card.id, field: "title" });
    call(createCardAction(board.id, card));
  };

  const remove = (card: CardData, undoable = true) => {
    setCards((cs) => cs.filter((c) => c.id !== card.id));
    setSelected(null);
    call(deleteCardAction(card.id));
    if (!undoable) return;
    toast(t.deleted, {
      duration: 8000,
      action: {
        label: t.undo,
        onClick: () => {
          setCards((cs) => [...cs, card]);
          call(createCardAction(board.id, card));
        },
      },
    });
  };

  // Pointer capture starts only after the pointer really moves, so click/double-click still reach the card.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    (document.activeElement as HTMLElement | null)?.blur();
    setSelected(null);
    gesture.current = { kind: "pan", sx: e.clientX, sy: e.clientY, ox: v.x, oy: v.y, ow: 0, z: 0, moved: false };
  };
  const startCard = (e: React.PointerEvent, card: CardData, kind: "move" | "resize") => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (kind === "move" && editing?.id === card.id && (e.target as HTMLElement).closest("[data-field]")) return; // selecting text
    setSelected(card.id);
    gesture.current = { kind, id: card.id, sx: e.clientX, sy: e.clientY, ox: card.x, oy: card.y, ow: card.width, z: cards.some((c) => c.id !== card.id && c.z >= card.z) ? maxZ + 1 : card.z, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.sx;
    const dy = e.clientY - g.sy;
    if (!g.moved) {
      if (Math.hypot(dx, dy) < 4) return;
      g.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (g.kind === "pan") setView({ ...v, x: g.ox + dx, y: g.oy + dy });
    else setCards((cs) => cs.map((c) => (c.id === g.id ? { ...c, ...patchFor(g, dx, dy, v.zoom) } : c)));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (g?.moved && g.id) save(g.id, patchFor(g, e.clientX - g.sx, e.clientY - g.sy, v.zoom));
  };
  const onDoubleClick = (e: React.MouseEvent) => {
    if (e.target !== viewport.current) return;
    const p = toWorld(v, e.clientX, e.clientY);
    add(p.x - CARD_WIDTH / 2, p.y - 24);
  };

  const zoomBy = (f: number) => setView(zoomAt(v, innerWidth / 2, innerHeight / 2, v.zoom * f));
  const addAtCentre = () => {
    const p = toWorld(v, innerWidth / 2, innerHeight / 2);
    add(p.x - CARD_WIDTH / 2, p.y - 60);
  };
  const rename = (value: string) => {
    const next = value.trim();
    if (!next || next === title) return;
    setTitle(next);
    call(renameBoardAction(board.id, next));
  };

  const dot = 24 * v.zoom;
  return (
    <>
      <div
        ref={viewport}
        className="canvas-dots fixed inset-0 touch-none overflow-hidden select-none"
        style={{ "--dot": `${dot}px`, "--dot-x": `${v.x % dot}px`, "--dot-y": `${v.y % dot}px` } as React.CSSProperties}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (gesture.current = null)}
        onDoubleClick={onDoubleClick}
      >
        <div className="absolute top-0 left-0 origin-top-left" style={{ transform: `translate(${v.x}px, ${v.y}px) scale(${v.zoom})`, visibility: view ? undefined : "hidden" }}>
          {cards.map((card) => (
            <CardView
              key={card.id}
              card={card}
              t={t}
              selected={selected === card.id}
              dim={!matches(card)}
              editingField={editing?.id === card.id ? editing.field : null}
              onPointerDown={(e, kind) => startCard(e, card, kind)}
              onEdit={(field) => setEditing({ id: card.id, field })}
              onSelect={() => setSelected(card.id)}
              onSave={(patch) => save(card.id, patch)}
              onRemove={() => remove(card)}
              onDone={(empty) => {
                setEditing(null);
                if (empty) remove(card, false); // a new card left blank
              }}
            />
          ))}
        </div>
        {!cards.length && <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-neutral-500">{t.emptyHint}</p>}
      </div>

      <div className="pointer-events-none fixed inset-x-3 top-3 z-10 flex">
        <div className="pointer-events-auto flex h-9 max-w-full min-w-0 items-center gap-1 rounded-full border border-neutral-200 bg-white/90 px-1 shadow-sm backdrop-blur">
          <Link href={`/${locale}`} aria-label={t.back} title={t.back} className="grid size-7 shrink-0 place-items-center rounded-full text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
          <input
            defaultValue={title}
            key={title}
            aria-label={t.title}
            maxLength={120}
            onBlur={(e) => rename(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="field-sizing-content max-w-56 min-w-12 shrink-0 rounded-md bg-transparent px-1.5 py-0.5 text-sm font-semibold outline-none hover:bg-neutral-100 focus:bg-neutral-100"
          />
          {tags.length > 0 && (
            <>
              <span className="mx-1 h-4 w-px shrink-0 bg-neutral-200" aria-hidden />
              <div role="group" aria-label={t.tags} className="flex min-w-0 gap-0.5 overflow-x-auto [scrollbar-width:none]">
                {[null, ...tags].map((tg) => (
                  <button
                    key={tg ?? ""}
                    aria-pressed={activeTag === tg}
                    onClick={() => setTag(tg)}
                    className="shrink-0 rounded-full px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100 aria-pressed:bg-neutral-900 aria-pressed:text-white"
                  >
                    {tg ?? t.all}
                  </button>
                ))}
              </div>
            </>
          )}
          <span className="mx-1 h-4 w-px shrink-0 bg-neutral-200" aria-hidden />
          <button onClick={() => setFocusOpen(true)} className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100">
            <Cards className="size-3.5" aria-hidden />
            {t.focusMode}
          </button>
          <button onClick={addAtCentre} aria-label={t.addCard} title={t.addCard} className="grid size-7 shrink-0 place-items-center rounded-full bg-neutral-900 text-white hover:bg-neutral-700">
            <Plus weight="bold" className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="fixed right-3 bottom-3 z-10 flex h-9 items-center rounded-full border border-neutral-200 bg-white/90 px-1 text-neutral-600 shadow-sm backdrop-blur">
        <button onClick={() => zoomBy(1 / 1.25)} aria-label={t.zoomOut} title={t.zoomOut} className="grid size-7 place-items-center rounded-full hover:bg-neutral-100">
          <Minus className="size-3.5" aria-hidden />
        </button>
        <button onClick={fit} aria-label={t.fit} title={t.fit} className="h-7 w-12 rounded-full text-xs tabular-nums hover:bg-neutral-100">
          {Math.round(v.zoom * 100)}%
        </button>
        <button onClick={() => zoomBy(1.25)} aria-label={t.zoomIn} title={t.zoomIn} className="grid size-7 place-items-center rounded-full hover:bg-neutral-100">
          <Plus className="size-3.5" aria-hidden />
        </button>
      </div>

      {focusOpen && <Focus cards={ordered.filter(matches)} t={t.focus} untitled={t.untitledCard} onClose={() => setFocusOpen(false)} />}
    </>
  );
}

const MOVES: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const NEXT_FIELD: Partial<Record<Field, Field>> = { tag: "title", title: "body" };

function CardView({
  card,
  t,
  selected,
  dim,
  editingField,
  onPointerDown,
  onEdit,
  onSelect,
  onSave,
  onRemove,
  onDone,
}: {
  card: CardData;
  t: T;
  selected: boolean;
  dim: boolean;
  editingField: Field | null;
  onPointerDown: (e: React.PointerEvent, kind: "move" | "resize") => void;
  onEdit: (field: Field) => void;
  onSelect: () => void;
  onSave: (patch: Patch) => void;
  onRemove: () => void;
  onDone: (empty: boolean) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const editing = editingField !== null;
  const fieldEl = (f: Field) => root.current?.querySelector<HTMLElement>(`[data-field=${f}]`);

  useEffect(() => {
    const el = editingField && fieldEl(editingField);
    if (!el) return;
    el.focus();
    getSelection()?.selectAllChildren(el);
    getSelection()?.collapseToEnd();
  }, [editingField]);

  const commit = (field: Field, raw: string) => {
    const text = field === "body" ? raw.replace(/\s+$/, "") : raw.replace(/\s+/g, " ").trim();
    const value = field === "tag" ? text.slice(0, 40) || null : text;
    if (value !== card[field]) onSave({ [field]: value });
  };

  // Each field is its own contentEditable, saved on blur. key = value: after a save React remounts the node
  // instead of patching text the browser already changed.
  const text = (field: Field, value: string, className: string, placeholder: string) =>
    editing || value ? (
      <div
        key={`${field}:${value}`}
        data-field={field}
        data-placeholder={placeholder}
        contentEditable={editing ? "plaintext-only" : false}
        suppressContentEditableWarning
        role={editing ? "textbox" : undefined}
        aria-label={editing ? placeholder : undefined}
        aria-multiline={editing && field === "body" ? true : undefined}
        spellCheck={editing}
        onBlur={editing ? (e) => commit(field, e.currentTarget.innerText) : undefined}
        onKeyDown={
          editing
            ? (e) => {
                if (e.key === "Escape") e.currentTarget.blur();
                const next = NEXT_FIELD[field];
                if (e.key === "Enter" && next) {
                  e.preventDefault();
                  fieldEl(next)?.focus();
                }
              }
            : undefined
        }
        className={`${className} break-words whitespace-pre-wrap outline-none empty:before:text-neutral-400 empty:before:content-[attr(data-placeholder)] ${editing ? "-mx-1 cursor-text rounded px-1 select-text focus:bg-neutral-100/70" : ""}`}
      >
        {value}
      </div>
    ) : null;

  return (
    <div
      id={`card-${card.id}`}
      ref={root}
      tabIndex={0}
      aria-label={fill(t.card, { title: card.title || t.untitledCard })}
      aria-description={t.cardHelp}
      style={{ left: card.x, top: card.y, width: card.width, zIndex: card.z }}
      className={`absolute rounded-md bg-white px-4.5 pt-4 pb-5 transition-[box-shadow,opacity] outline-none ${
        selected ? "shadow-lg ring-2 ring-cork" : "shadow-[0_1px_3px_rgba(0,0,0,.08)] hover:shadow-md"
      } ${dim ? "opacity-20" : ""} ${editing ? "" : "cursor-grab active:cursor-grabbing"}`}
      onPointerDown={(e) => onPointerDown(e, "move")}
      onFocus={(e) => e.target === e.currentTarget && onSelect()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!editing) onEdit(((e.target as HTMLElement).closest("[data-field]") as HTMLElement | null)?.dataset.field as Field ?? "title");
      }}
      onBlur={(e) => {
        if (!editing || e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        onDone((["tag", "title", "body"] as const).every((f) => !fieldEl(f)?.innerText.trim()));
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return; // typing inside a field
        const move = MOVES[e.key];
        if (e.key === "Enter") {
          e.preventDefault();
          onEdit("title");
        } else if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          onRemove();
        } else if (move) {
          e.preventDefault();
          const step = e.shiftKey ? 50 : 10;
          onSave({ x: card.x + move[0] * step, y: card.y + move[1] * step });
        }
      }}
    >
      {text("tag", card.tag ?? "", "mb-1.5 text-[10px] font-medium tracking-[.08em] text-neutral-500 uppercase", t.tagPlaceholder)}
      {text("title", card.title, "font-serif text-[15px] leading-snug font-bold text-[#1e2a3a]", t.titlePlaceholder)}
      {text("body", card.body, "mt-2 text-[13px] leading-relaxed text-neutral-700", t.bodyPlaceholder)}
      <div aria-hidden title={t.resize} onPointerDown={(e) => onPointerDown(e, "resize")} className="absolute top-0 -right-1.5 h-full w-3 cursor-ew-resize" />
    </div>
  );
}
