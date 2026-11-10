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

/** View that centres all rects in a w×h screen, never zoomed in past 100%. */
export function fitView(rects: Rect[], w: number, h: number, pad = 80): View {
  if (!rects.length) return { x: 0, y: 0, zoom: 1 };
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const bw = Math.max(...rects.map((r) => r.x + r.w)) - minX;
  const bh = Math.max(...rects.map((r) => r.y + r.h)) - minY;
  const zoom = clampZoom(Math.min((w - 2 * pad) / bw, (h - 2 * pad) / bh, 1));
  return { zoom, x: (w - bw * zoom) / 2 - minX * zoom, y: (h - bh * zoom) / 2 - minY * zoom };
}
