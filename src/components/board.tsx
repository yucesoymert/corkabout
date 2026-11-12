"use client";

import { ArrowLeft, Cards, Minus, Plus, SpeakerHigh, Stop } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { createCardAction, deleteCardAction, moveCardsAction, renameBoardAction, updateCardAction } from "@/app/[lang]/actions";
import type { Dictionary } from "@/i18n/tr";
import type { Locale } from "@/i18n/locales";
import { clampZoom, fitView, GRID, masonry, READABLE_ZOOM, snap, tagRows, tidy, toWorld, zoomAt, type Placed, type View } from "@/lib/canvas";
import { fill } from "@/lib/format";
import { speak, speakingKey, stop, subscribeSpeech } from "@/lib/speech";
import { type Account, type Arrangement, BoardMenu } from "./board-menu";
import { Composer, type Draft } from "./composer";
import { Focus } from "./focus";

export type CardData = { id: string; title: string; body: string; tag: string | null; x: number; y: number; width: number; z: number };
type Field = "tag" | "title" | "body";
type Patch = Partial<Omit<CardData, "id">>;
type T = Dictionary["board"] & { focus: Dictionary["focus"]; menu: Dictionary["menu"] };
type Gesture = {
  kind: "pan" | "move" | "resize";
  id?: string;
  sx: number;
  sy: number;
  ox: number;
  oy: number;
  ow: number;
  z: number;
  moved: boolean;
  hold?: Gesture; // touch on a card: pans unless the finger stays still long enough, then becomes this card move
  tap?: { id: string; field: Field; wasSelected: boolean }; // touch: a second tap on a selected card edits it
};
const HOLD_MS = 350;

const CARD_WIDTH = 12 * GRID;
const GLIDE = "transform 450ms cubic-bezier(0.22, 1, 0.36, 1)";
const DOTS_GLIDE = ["background-size", "background-position"].map((p) => GLIDE.replace("transform", p)).join(", ");
const viewKey = (boardId: string) => `corkabout:view:${boardId}`;

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
    ? { x: snap(g.ox + dx / zoom), y: snap(g.oy + dy / zoom), z: g.z }
    : { width: Math.min(50 * GRID, Math.max(7 * GRID, snap(g.ox + g.ow + dx / zoom) - g.ox)) }; // right edge on a dot

export function Board({
  board,
  initialCards,
  locale,
  account,
  languages,
  t,
}: {
  board: { id: string; title: string };
  initialCards: CardData[];
  locale: Locale;
  account: Account;
  languages: Record<Locale, string>;
  t: T;
}) {
  const [cards, setCards] = useState(initialCards);
  const [title, setTitle] = useState(board.title);
  const [view, setView] = useState<View | null>(null); // null until the saved view is read (localStorage is client-only)
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; field: Field } | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [focusOpen, setFocusOpen] = useState(false);
  const [composing, setComposing] = useState<{ at?: { x: number; y: number } } | null>(null); // new-card dialog; `at` = double-clicked world point
  const [glide, setGlide] = useState(false); // animate the camera for jumps (tag, fit, zoom buttons), not for pan/zoom gestures
  const viewport = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>()); // fingers/mice down on the canvas
  const pinch = useRef<{ d0: number; m0: { x: number; y: number }; v0: View } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
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
  const rects = (list: CardData[]) => list.map((c) => ({ x: c.x, y: c.y, w: c.width, h: document.getElementById(`card-${c.id}`)?.offsetHeight ?? 120 }));
  /** Readable view of these cards: all of them if they fit at READABLE_ZOOM, otherwise their top-left corner. */
  const readableView = (list: CardData[]) => fitView(rects(list), innerWidth, innerHeight, READABLE_ZOOM);
  const jump = (next: View) => {
    setGlide(true);
    setView(next);
  };
  const fit = () => jump(fitView(rects(cards), innerWidth, innerHeight));
  const pickTag = (tg: string | null) => {
    setTag(tg);
    jump(readableView(tg ? cards.filter((c) => c.tag === tg) : cards));
  };

  // Once on mount: the last view of this board, or a readable view of its start.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage and card heights only exist after hydration
    setView(savedView(board.id) ?? readableView(cards));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);

  useEffect(() => {
    if (!view) return;
    zoomRef.current = view.zoom;
    const h = setTimeout(() => localStorage.setItem(viewKey(board.id), JSON.stringify(view)), 300);
    return () => clearTimeout(h);
  }, [view, board.id]);

  useEffect(() => stop, []); // leaving the board stops reading

  // Wheel = pan, ⌘/Ctrl+wheel and trackpad pinch = zoom. Native listeners: React's wheel listener is passive (can't preventDefault).
  useEffect(() => {
    const el = viewport.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setGlide(false);
      const k = e.deltaMode === 1 ? 16 : 1; // Firefox mouse wheels report lines
      if (e.ctrlKey || e.metaKey) setView((v) => v && zoomAt(v, e.clientX, e.clientY, v.zoom * Math.exp(-e.deltaY * k * 0.01)));
      else setView((v) => v && { ...v, x: v.x - e.deltaX * k, y: v.y - e.deltaY * k });
    };
    // Safari sends trackpad pinch as gesture events instead of ctrl+wheel
    type Gesture = Event & { scale: number; clientX: number; clientY: number };
    let start = 1;
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      setGlide(false);
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

  const height = (c: CardData) => document.getElementById(`card-${c.id}`)?.offsetHeight ?? 120;
  /** Where a new card goes: the double-clicked spot, else under the last card of its tag's column, else the screen centre. */
  const spotFor = (d: Draft, at?: { x: number; y: number }) => {
    if (at) return at;
    const col = d.tag ? cards.filter((c) => c.tag === d.tag) : [];
    if (col.length) {
      const last = col.reduce((a, b) => (b.y + height(b) > a.y + height(a) ? b : a));
      return { x: last.x, y: last.y + height(last) + GRID };
    }
    const p = toWorld(v, innerWidth / 2, innerHeight / 2);
    return { x: p.x - CARD_WIDTH / 2, y: p.y - 4 * GRID };
  };
  const add = (d: Draft, at?: { x: number; y: number }) => {
    const spot = spotFor(d, at);
    const card: CardData = { id: crypto.randomUUID(), ...d, x: snap(spot.x), y: snap(spot.y), width: CARD_WIDTH, z: maxZ + 1 };
    setCards((cs) => [...cs, card]);
    setSelected(card.id);
    call(createCardAction(board.id, card));
    // landed off screen (end of a long column): bring it into view
    const sx = card.x * v.zoom + v.x;
    const sy = card.y * v.zoom + v.y;
    if (sx < 0 || sy < 0 || sx > innerWidth - 120 || sy > innerHeight - 120) jump({ ...v, x: innerWidth / 2 - (card.x + card.width / 2) * v.zoom, y: innerHeight / 3 - card.y * v.zoom });
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
  const two = () => {
    const [a, b] = [...pointers.current.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };
  // Capture phase, before any card handler: a second finger always means pinch (zoom + pan), never a card drag.
  const onPointerDownCapture = (e: React.PointerEvent) => {
    if (e.isPrimary) pointers.current.clear(); // first finger of a new touch: forget any pointer whose "up" we missed
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size < 2) return;
    e.stopPropagation();
    clearTimeout(holdTimer.current);
    const g = gesture.current;
    if (g?.id && g.kind !== "pan") setCards((cs) => cs.map((c) => (c.id === g.id ? { ...c, x: g.ox, y: g.oy, width: g.ow } : c))); // undo the half drag
    gesture.current = null;
    setGlide(false);
    for (const id of pointers.current.keys()) {
      try {
        e.currentTarget.setPointerCapture(id);
      } catch {} // a pointer that already went away
    }
    const { d, m } = two();
    pinch.current = { d0: d, m0: m, v0: v };
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    (document.activeElement as HTMLElement | null)?.blur();
    setSelected(null);
    setGlide(false);
    gesture.current = { kind: "pan", sx: e.clientX, sy: e.clientY, ox: v.x, oy: v.y, ow: 0, z: 0, moved: false };
  };
  const startCard = (e: React.PointerEvent, card: CardData, kind: "move" | "resize") => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const field = ((e.target as HTMLElement).closest("[data-field]") as HTMLElement | null)?.dataset.field as Field | undefined;
    if (kind === "move" && editing?.id === card.id && field) return; // selecting text
    const move: Gesture = { kind, id: card.id, sx: e.clientX, sy: e.clientY, ox: card.x, oy: card.y, ow: card.width, z: cards.some((c) => c.id !== card.id && c.z >= card.z) ? maxZ + 1 : card.z, moved: false };
    if (e.pointerType !== "touch" || kind === "resize") {
      setSelected(card.id);
      gesture.current = move;
      return;
    }
    // Touch: one finger pans the canvas; holding still on the card picks it up.
    (document.activeElement as HTMLElement | null)?.blur();
    setGlide(false);
    const pan: Gesture = { kind: "pan", sx: e.clientX, sy: e.clientY, ox: v.x, oy: v.y, ow: 0, z: 0, moved: false, hold: move, tap: { id: card.id, field: field ?? "title", wasSelected: selected === card.id } };
    gesture.current = pan;
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      if (gesture.current !== pan || pan.moved) return;
      gesture.current = move;
      setSelected(card.id);
      navigator.vibrate?.(10);
    }, HOLD_MS);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = pinch.current;
    if (p && pointers.current.size >= 2) {
      const { d, m } = two();
      const zoom = clampZoom(p.v0.zoom * (d / p.d0));
      const w = toWorld(p.v0, p.m0.x, p.m0.y); // the world point that was between the fingers stays between them
      setView({ zoom, x: m.x - w.x * zoom, y: m.y - w.y * zoom });
      return;
    }
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.sx;
    const dy = e.clientY - g.sy;
    if (!g.moved) {
      if (Math.hypot(dx, dy) < (e.pointerType === "touch" ? 8 : 4)) return;
      g.moved = true;
      if (g.hold) clearTimeout(holdTimer.current);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {} // the pointer is already gone
    }
    if (g.kind === "pan") setView({ ...v, x: g.ox + dx, y: g.oy + dy });
    else setCards((cs) => cs.map((c) => (c.id === g.id ? { ...c, ...patchFor(g, dx, dy, v.zoom) } : c)));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pinch.current) {
      if (pointers.current.size < 2) pinch.current = null; // the finger left behind does nothing until it lifts
      gesture.current = null;
      return;
    }
    clearTimeout(holdTimer.current);
    const g = gesture.current;
    gesture.current = null;
    if (g?.moved && g.id) save(g.id, patchFor(g, e.clientX - g.sx, e.clientY - g.sy, v.zoom));
    else if (g && !g.moved && g.tap) {
      const { id, field, wasSelected } = g.tap;
      if (!wasSelected) return setSelected(id);
      // Second tap on a selected card: edit. Render and focus inside the tap, or iOS won't open the keyboard.
      flushSync(() => setEditing({ id, field }));
      document.querySelector<HTMLElement>(`#card-${id} [data-field=${field}]`)?.focus();
    }
  };
  const onPointerCancel = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    clearTimeout(holdTimer.current);
    gesture.current = null;
  };
  const onDoubleClick = (e: React.MouseEvent) => {
    if (e.target !== viewport.current) return;
    const p = toWorld(v, e.clientX, e.clientY);
    setComposing({ at: { x: p.x - CARD_WIDTH / 2, y: p.y - GRID } });
  };

  const place = (list: { id: string; x: number; y: number }[]) => {
    const at = new Map(list.map((m) => [m.id, m]));
    setCards((cs) => cs.map((c) => (at.has(c.id) ? { ...c, ...at.get(c.id) } : c)));
    call(moveCardsAction(board.id, list));
  };
  const LAYOUTS: Record<Arrangement, (list: Placed[]) => { id: string; x: number; y: number }[]> = {
    tagColumns: tidy,
    tagRows,
    gridByTag: (list) => masonry(list, (a, b) => (a.tag ?? "\uffff").localeCompare(b.tag ?? "\uffff", locale) || a.y - b.y || a.x - b.x),
    gridByTitle: (list) => {
      const title = new Map(cards.map((c) => [c.id, c.title]));
      return masonry(list, (a, b) => title.get(a.id)!.localeCompare(title.get(b.id)!, locale));
    },
  };
  const arrange = (kind: Arrangement) => {
    const before = cards.map(({ id, x, y }) => ({ id, x, y }));
    const after = LAYOUTS[kind](rects(cards).map((r, i) => ({ ...r, id: cards[i].id, tag: cards[i].tag, width: cards[i].width })));
    place(after);
    toast(t.tidied, { duration: 8000, action: { label: t.undo, onClick: () => place(before) } });
  };
  const zoomBy = (f: number) => jump(zoomAt(v, innerWidth / 2, innerHeight / 2, v.zoom * f));
  const rename = (value: string) => {
    const next = value.trim();
    if (!next || next === title) return;
    setTitle(next);
    call(renameBoardAction(board.id, next));
  };

  const chips = () => (
    <div
      role="group"
      aria-label={t.tags}
      // mouse wheels only scroll vertically; turn that into sideways scrolling of the chips
      onWheel={(e) => Math.abs(e.deltaY) > Math.abs(e.deltaX) && (e.currentTarget.scrollLeft += e.deltaY)}
      className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto px-2 [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)] [scrollbar-width:none]"
    >
      {[null, ...tags].map((tg) => (
        <button
          key={tg ?? ""}
          aria-pressed={activeTag === tg}
          onClick={(e) => {
            pickTag(tg);
            e.currentTarget.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
          }}
          className="shrink-0 rounded-full px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 aria-pressed:bg-neutral-900 aria-pressed:text-white sm:px-2.5 sm:py-1 sm:text-xs"
        >
          {tg ?? t.all}
        </button>
      ))}
    </div>
  );

  const dot = GRID * v.zoom; // each dot sits in the middle of its tile, hence the half-tile offset below
  return (
    <>
      <div
        ref={viewport}
        className="canvas-dots fixed inset-0 touch-none overflow-hidden select-none [-webkit-touch-callout:none]"
        style={{ "--dot": `${dot}px`, "--dot-x": `${v.x - dot / 2}px`, "--dot-y": `${v.y - dot / 2}px`, transition: glide ? DOTS_GLIDE : undefined } as React.CSSProperties}
        onPointerDownCapture={onPointerDownCapture}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onDoubleClick={onDoubleClick}
      >
        <div className="absolute top-0 left-0 origin-top-left" style={{ transform: `translate(${v.x}px, ${v.y}px) scale(${v.zoom})`, transition: glide ? GLIDE : undefined, visibility: view ? undefined : "hidden" }}>
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

      {/* Phones: one row of controls, the tag chips on their own full-width row below. sm+: one centred pill. */}
      <div className="pointer-events-none fixed top-3 right-14 left-3 z-10 flex flex-col gap-2 sm:inset-x-14 sm:items-center">
        <div className="pointer-events-auto flex h-10 min-w-0 items-center gap-1 rounded-full border border-neutral-200 bg-white/90 px-1 shadow-sm backdrop-blur sm:h-9 sm:max-w-4xl">
          <Link href={`/${locale}`} aria-label={t.back} title={t.back} className="grid size-8 shrink-0 place-items-center rounded-full text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 sm:size-7">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
          <input
            defaultValue={title}
            key={title}
            aria-label={t.title}
            maxLength={120}
            onBlur={(e) => rename(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="min-w-0 flex-1 rounded-md bg-transparent px-1.5 py-0.5 text-sm font-semibold outline-none hover:bg-neutral-100 focus:bg-neutral-100 sm:field-sizing-content sm:max-w-56 sm:min-w-12 sm:flex-none sm:shrink-0"
          />
          {tags.length > 0 && (
            <div className="hidden min-w-0 items-center sm:flex">
              <span className="mx-1 h-4 w-px shrink-0 bg-neutral-200" aria-hidden />
              {chips()}
            </div>
          )}
          <span className="mx-1 h-4 w-px shrink-0 bg-neutral-200" aria-hidden />
          <button
            onClick={() => setFocusOpen(true)}
            aria-label={t.focusMode}
            title={t.focusMode}
            className="flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 sm:h-7"
          >
            <Cards className="size-4 sm:size-3.5" aria-hidden />
            <span className="hidden sm:inline">{t.focusMode}</span>
          </button>
          <button onClick={() => setComposing({})} aria-label={t.addCard} title={t.addCard} className="grid size-8 shrink-0 place-items-center rounded-full bg-neutral-900 text-white hover:bg-neutral-700 sm:size-7">
            <Plus weight="bold" className="size-3.5" aria-hidden />
          </button>
        </div>
        {tags.length > 0 && (
          <div className="pointer-events-auto -mr-11 flex h-10 items-center rounded-full border border-neutral-200 bg-white/90 shadow-sm backdrop-blur sm:hidden">{chips()}</div>
        )}
      </div>

      <div className="fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 flex h-10 items-center rounded-full sm:h-9 border border-neutral-200 bg-white/90 px-1 text-neutral-600 shadow-sm backdrop-blur">
<button onClick={() => zoomBy(1 / 1.25)} aria-label={t.zoomOut} title={t.zoomOut} className="grid size-8 place-items-center sm:size-7 rounded-full hover:bg-neutral-100">
          <Minus className="size-3.5" aria-hidden />
        </button>
        <button onClick={fit} aria-label={t.fit} title={t.fit} className="h-8 w-12 rounded-full text-xs tabular-nums hover:bg-neutral-100 sm:h-7">
          {Math.round(v.zoom * 100)}%
        </button>
        <button onClick={() => zoomBy(1.25)} aria-label={t.zoomIn} title={t.zoomIn} className="grid size-8 place-items-center sm:size-7 rounded-full hover:bg-neutral-100">
          <Plus className="size-3.5" aria-hidden />
        </button>
      </div>

      <BoardMenu account={account} boardId={board.id} locale={locale} languages={languages} t={t.menu} onArrange={arrange} />
      {composing && <Composer tags={tags} tag={activeTag} t={t} onAdd={(d) => add(d, composing.at)} onClose={() => setComposing(null)} />}
      {focusOpen && <Focus cards={ordered.filter(matches)} t={t.focus} untitled={t.untitledCard} onClose={() => setFocusOpen(false)} />}
    </>
  );
}

/** Title then body; a title without end punctuation gets a full stop so it is read as its own sentence. */
export const readable = (c: { title: string; body: string }) => [c.title && (/[.!?…:]$/.test(c.title.trim()) ? c.title : `${c.title}.`), c.body].filter(Boolean).join(" ");

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
  const reading = useSyncExternalStore(subscribeSpeech, speakingKey, () => null) === card.id;
  const inner = useRef<HTMLDivElement>(null);

  // The card box is always a whole number of grid cells tall, so stacked cards leave exactly one cell between them.
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (root.current && inner.current) root.current.style.height = `${Math.ceil(inner.current.offsetHeight / GRID) * GRID}px`;
    });
    ro.observe(inner.current!);
    return () => ro.disconnect();
  }, []);
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
      className={`group absolute rounded-md bg-white transition-[box-shadow,opacity] outline-none ${
        selected ? "shadow-lg ring-2 ring-cork" : "shadow-[0_1px_3px_rgba(0,0,0,.08)] hover:shadow-md dark:ring-1 dark:ring-neutral-200"
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
          const step = e.shiftKey ? 4 * GRID : GRID;
          onSave({ x: snap(card.x) + move[0] * step, y: snap(card.y) + move[1] * step });
        }
      }}
    >
      <div ref={inner} className="px-4.5 pt-4 pb-5">
      {text("tag", card.tag ?? "", "mb-1.5 pr-5 text-[10px] font-medium tracking-[.08em] text-neutral-500 uppercase", t.tagPlaceholder)}
      {text("title", card.title, "pr-5 font-serif text-[15px] leading-snug font-bold text-ink", t.titlePlaceholder)}
      {text("body", card.body, "mt-2 text-[13px] leading-relaxed text-neutral-700", t.bodyPlaceholder)}
      </div>
      {(card.title || card.body) && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onClick={() => speak(card.id, readable(card))}
          aria-label={reading ? t.stopReading : t.read}
          title={reading ? t.stopReading : t.read}
          className={`absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-white text-neutral-500 shadow-sm ring-1 ring-neutral-200 transition hover:text-neutral-900 focus-visible:opacity-100 ${
            reading ? "text-cork opacity-100" : selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {reading ? <Stop weight="fill" className="size-3" aria-hidden /> : <SpeakerHigh className="size-3" aria-hidden />}
        </button>
      )}
      <div aria-hidden title={t.resize} onPointerDown={(e) => onPointerDown(e, "resize")} className="absolute top-0 -right-1.5 h-full w-3 cursor-ew-resize" />
    </div>
  );
}
