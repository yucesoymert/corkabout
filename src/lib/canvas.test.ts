import assert from "node:assert/strict";
import { test } from "node:test";
import { fitView, MAX_ZOOM, MIN_ZOOM, READABLE_ZOOM, toWorld, zoomAt } from "./canvas";

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
