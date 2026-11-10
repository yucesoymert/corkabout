// Board canvas math. Screen point = world point * zoom + (x, y); the world div gets translate(x, y) scale(zoom).
export type View = { x: number; y: number; zoom: number };
export type Rect = { x: number; y: number; w: number; h: number };

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 2;

export const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

export const toWorld = (v: View, sx: number, sy: number) => ({ x: (sx - v.x) / v.zoom, y: (sy - v.y) / v.zoom });

/** New zoom level that keeps the world point under the screen point (sx, sy) where it is. */
export function zoomAt(v: View, sx: number, sy: number, zoom: number): View {
  const z = clampZoom(zoom);
  const w = toWorld(v, sx, sy);
  return { zoom: z, x: sx - w.x * z, y: sy - w.y * z };
}

/** Zoom floor for opening a board or jumping to a tag: below this the text gets too small to read. */
export const READABLE_ZOOM = 0.65;

/** World pixels between the canvas dots; card corners and widths snap to it. */
export const GRID = 24;
export const snap = (n: number) => Math.round(n / GRID) * GRID;

/** View that centres all rects in a w×h screen, never zoomed in past 100% or out past minZoom. If they
 * don't fit at minZoom, that axis starts at the top-left edge instead, so the start of the board stays on screen. */
export function fitView(rects: Rect[], w: number, h: number, minZoom = MIN_ZOOM, pad = 64): View {
  if (!rects.length) return { x: 0, y: 0, zoom: 1 };
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const bw = Math.max(...rects.map((r) => r.x + r.w)) - minX;
  const bh = Math.max(...rects.map((r) => r.y + r.h)) - minY;
  const zoom = clampZoom(Math.max(minZoom, Math.min((w - 2 * pad) / bw, (h - 2 * pad) / bh, 1)));
  const offset = (screen: number, size: number) => Math.max(pad, (screen - size * zoom) / 2);
  return { zoom, x: offset(w, bw) - minX * zoom, y: offset(h, bh) - minY * zoom };
}

export type Placed = { id: string; tag: string | null; x: number; y: number; width: number; h: number };

/** "Tidy": one column per tag (ordered by its leftmost card, untagged cards form their own column), cards top to
 * bottom in their current order, exactly one grid cell between neighbours. Starts at the board's top-left card. */
export function tidy(cards: Placed[]) {
  if (!cards.length) return [];
  const cols = new Map<string, Placed[]>();
  for (const c of [...cards].sort((a, b) => a.x - b.x || a.y - b.y)) cols.set(c.tag ?? "", [...(cols.get(c.tag ?? "") ?? []), c]);
  const top = snap(Math.min(...cards.map((c) => c.y)));
  let x = snap(Math.min(...cards.map((c) => c.x)));
  const out: { id: string; x: number; y: number }[] = [];
  for (const col of cols.values()) {
    let y = top;
    for (const c of col.sort((a, b) => a.y - b.y)) {
      out.push({ id: c.id, x, y });
      y += Math.ceil(c.h / GRID) * GRID + GRID;
    }
    x += Math.ceil(Math.max(...col.map((c) => c.width)) / GRID) * GRID + GRID;
  }
  return out;
}

const cellsUp = (n: number) => Math.ceil(n / GRID) * GRID; // round a size up to whole grid cells
const byTag = (cards: Placed[]) => {
  const groups = new Map<string, Placed[]>();
  for (const c of [...cards].sort((a, b) => a.y - b.y || a.x - b.x)) groups.set(c.tag ?? "", [...(groups.get(c.tag ?? "") ?? []), c]);
  return [...groups.values()];
};

/** One row per tag (ordered by its topmost card), cards left to right in their current order, one cell apart. */
export function tagRows(cards: Placed[]) {
  if (!cards.length) return [];
  let y = snap(Math.min(...cards.map((c) => c.y)));
  const left = snap(Math.min(...cards.map((c) => c.x)));
  const out: { id: string; x: number; y: number }[] = [];
  for (const row of byTag(cards)) {
    let x = left;
    for (const c of row.sort((a, b) => a.x - b.x)) {
      out.push({ id: c.id, x, y });
      x += cellsUp(c.width) + GRID;
    }
    y += Math.max(...row.map((c) => cellsUp(c.h))) + GRID;
  }
  return out;
}

/** Masonry grid in the given order: each card goes to the shortest column, one cell apart. */
export function masonry(cards: Placed[], order: (a: Placed, b: Placed) => number) {
  if (!cards.length) return [];
  const cols = Math.min(6, Math.ceil(Math.sqrt(cards.length))); // ponytail: column count from the card count, not the screen
  const colW = cellsUp(Math.max(...cards.map((c) => c.width))) + GRID;
  const left = snap(Math.min(...cards.map((c) => c.x)));
  const top = snap(Math.min(...cards.map((c) => c.y)));
  const bottoms = Array<number>(cols).fill(top);
  return [...cards].sort(order).map((c) => {
    const col = bottoms.indexOf(Math.min(...bottoms));
    const at = { id: c.id, x: left + col * colW, y: bottoms[col] };
    bottoms[col] += cellsUp(c.h) + GRID;
    return at;
  });
}
