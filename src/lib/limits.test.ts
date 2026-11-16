import assert from "node:assert/strict";
import { test } from "node:test";
import { isOurPhoto, MAX_PHOTOS_FREE, MAX_PHOTOS_PRO, photoLimit } from "./limits";

test("photoLimit: owners unlimited, Pro until its date, everyone else free", () => {
  const now = new Date("2026-11-15");
  const owners = " Me@Example.com , other@x.com";
  assert.equal(photoLimit("me@example.com", null, now, owners), null);
  assert.equal(photoLimit("you@example.com", null, now, owners), MAX_PHOTOS_FREE);
  assert.equal(photoLimit("you@example.com", new Date("2026-12-01"), now, owners), MAX_PHOTOS_PRO);
  assert.equal(photoLimit("you@example.com", new Date("2026-11-01"), now, owners), MAX_PHOTOS_FREE);
  assert.equal(photoLimit(null, null, now, ""), MAX_PHOTOS_FREE);
});

test("isOurPhoto: only https URLs of this Blob store", () => {
  const id = "store_AbC123";
  assert.ok(isOurPhoto("https://abc123.public.blob.vercel-storage.com/photos/a-xyz.webp", id));
  assert.ok(!isOurPhoto("https://other.public.blob.vercel-storage.com/a.webp", id));
  assert.ok(!isOurPhoto("http://abc123.public.blob.vercel-storage.com/a.webp", id));
  assert.ok(!isOurPhoto("https://evil.com/abc123.public.blob.vercel-storage.com", id));
  assert.ok(!isOurPhoto("not a url", id));
  assert.ok(!isOurPhoto("https://abc123.public.blob.vercel-storage.com/a.webp", ""));
});
