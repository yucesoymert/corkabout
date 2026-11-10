import assert from "node:assert/strict";
import { test } from "node:test";
import { fitView, GRID, masonry, MAX_ZOOM, MIN_ZOOM, READABLE_ZOOM, snap, tagRows, tidy, toWorld, zoomAt } from "./canvas";

test("zoomAt keeps the point under the cursor fixed", () => {
  const v = { x: 120, y: -40, zoom: 0.8 };
  const before = toWorld(v, 500, 300);
  const after = toWorld(zoomAt(v, 500, 300, 1.6), 500, 300);
  assert.ok(Math.abs(before.x - after.x) < 1e-9 && Math.abs(before.y - after.y) < 1e-9);
});

test("zoomAt clamps the zoom level", () => {
  assert.equal(zoomAt({ x: 0, y: 0, zoom: 1 }, 0, 0, 99).zoom, MAX_ZOOM);
  assert.equal(zoomAt({ x: 0, y: 0, zoom: 1 }, 0, 0, 0.001).zoom, MIN_ZOOM);
});

test("fitView centres the cards and never zooms past 100%", () => {
  const small = fitView([{ x: 1000, y: 1000, w: 100, h: 100 }], 1000, 800);
  assert.equal(small.zoom, 1);
  assert.deepEqual(toWorld(small, 500, 400), { x: 1050, y: 1050 }); // screen centre = card centre

  const wide = fitView([{ x: 0, y: 0, w: 300, h: 200 }, { x: 3700, y: 0, w: 300, h: 200 }], 1000, 800);
  assert.equal(wide.zoom, (1000 - 2 * 64) / 4000); // width-bound: 872 px for a 4000 px wide world
  assert.deepEqual(fitView([], 1000, 800), { x: 0, y: 0, zoom: 1 });

  // Too tall even at MIN_ZOOM: the top stays on screen instead of being centred off it.
  const tall = fitView([{ x: 0, y: 500, w: 300, h: 20000 }], 1000, 800);
  assert.equal(tall.zoom, MIN_ZOOM);
  assert.equal(toWorld(tall, 0, 64).y, 500);

  // With a readable floor the zoom stops there and the board opens at its top-left corner.
  const readable = fitView([{ x: 100, y: 200, w: 4000, h: 3000 }], 1000, 800, READABLE_ZOOM);
  assert.equal(readable.zoom, READABLE_ZOOM);
  assert.deepEqual(toWorld(readable, 64, 64), { x: 100, y: 200 });
});

test("snap rounds to the nearest dot, negatives too", () => {
  assert.equal(snap(0), 0);
  assert.equal(snap(GRID / 2 - 1), 0);
  assert.equal(snap(GRID / 2 + 1), GRID);
  assert.equal(snap(-GRID - 5), -GRID);
  assert.equal(snap(301), 312);
});

test("tidy stacks each tag in its own column with one grid cell between cards", () => {
  const out = tidy([
    { id: "b2", tag: "B", x: 900, y: 500, width: 288, h: 96 },
    { id: "a1", tag: "A", x: 30, y: 10, width: 288, h: 120 },
    { id: "b1", tag: "B", x: 1000, y: 20, width: 300, h: 50 },
    { id: "a2", tag: "A", x: 400, y: 700, width: 288, h: 72 },
    { id: "n", tag: null, x: 2000, y: 0, width: 288, h: 48 },
  ]);
  const at = Object.fromEntries(out.map((p) => [p.id, [p.x, p.y]]));
  assert.deepEqual(at.a1, [24, 0]); // starts on the grid at the top-left card
  assert.deepEqual(at.a2, [24, 120 + GRID]); // 120 = 5 cells, then one empty cell
  assert.deepEqual(at.b1, [24 + 288 + GRID, 0]); // next column: widest card A (288) + one cell
  assert.deepEqual(at.b2, [24 + 288 + GRID, 72 + GRID]); // 50 px rounds up to 3 cells
  assert.deepEqual(at.n, [24 + 288 + GRID + 312 + GRID, 0]); // B's widest is 300 → 13 cells; untagged last
});

const card = (id: string, tag: string | null, x: number, y: number, h = 48) => ({ id, tag, x, y, width: 288, h });

test("tagRows puts each tag on its own row, one cell apart", () => {
  const at = Object.fromEntries(tagRows([card("a2", "A", 900, 0, 96), card("b1", "B", 0, 500), card("a1", "A", 0, 10, 120)]).map((p) => [p.id, [p.x, p.y]]));
  assert.deepEqual(at.a1, [0, 0]);
  assert.deepEqual(at.a2, [288 + GRID, 0]); // left to right, one cell between
  assert.deepEqual(at.b1, [0, 120 + GRID]); // next row starts under the tallest card of A
});

test("masonry fills the shortest column in the given order", () => {
  const list = [card("c", null, 0, 0, 240), card("a", null, 0, 0, 48), card("b", null, 0, 0, 48), card("d", null, 0, 0, 48)];
  const at = Object.fromEntries(masonry(list, (p, q) => p.id.localeCompare(q.id)).map((p) => [p.id, [p.x, p.y]]));
  // 4 cards → 2 columns of 288 + one cell
  assert.deepEqual(at.a, [0, 0]);
  assert.deepEqual(at.b, [312, 0]);
  assert.deepEqual(at.c, [0, 48 + GRID]);
  assert.deepEqual(at.d, [312, 48 + GRID]); // column 2 is shorter than column 1 (which has c)
});
