import assert from "node:assert/strict";
import { test } from "node:test";
import { chunks, langOf } from "./speech";

test("langOf picks Turkish only when Turkish letters show up", () => {
  assert.equal(langOf("Tell me about yourself."), "en-US");
  assert.equal(langOf("Hydration nedir? Server, sayfanın HTML'ini gönderir."), "tr-TR");
});

test("chunks splits into sentences and caps long ones at a word boundary", () => {
  assert.deepEqual(chunks("First one. Second one!  Third?"), ["First one.", "Second one!", "Third?"]);
  const long = Array(80).fill("word").join(" ") + ".";
  const parts = chunks(long, 50);
  assert.ok(parts.every((p) => p.length <= 50));
  assert.equal(parts.join(" "), long);
  assert.deepEqual(chunks("   "), []);
});
