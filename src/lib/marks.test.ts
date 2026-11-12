import assert from "node:assert/strict";
import { test } from "node:test";
import { fromChars, normalize, paint, toChars, toHtml, type Mark } from "./marks";

test("marks survive a round trip through characters, runs are packed per kind", () => {
  const marks: Mark[] = [
    { f: "body", s: 0, e: 5, c: "yellow", k: "hl" },
    { f: "body", s: 3, e: 8, c: "blue", k: "fg" },
    { f: "title", s: 0, e: 2, c: "red", k: "fg" }, // other field: ignored
  ];
  const back = fromChars(toChars("hello world", marks, "body"), "body");
  assert.equal(back.text, "hello world");
  assert.deepEqual(back.marks, [
    { f: "body", s: 3, e: 8, c: "blue", k: "fg" },
    { f: "body", s: 0, e: 5, c: "yellow", k: "hl" },
  ]);
});

test("paint replaces one kind in a range and splits what it cuts; null clears", () => {
  let chars = toChars("abcdef", [{ f: "body", s: 0, e: 6, c: "yellow", k: "hl" }], "body");
  chars = paint(chars, 2, 4, "hl", "green");
  assert.deepEqual(fromChars(chars, "body").marks, [
    { f: "body", s: 0, e: 2, c: "yellow", k: "hl" },
    { f: "body", s: 2, e: 4, c: "green", k: "hl" },
    { f: "body", s: 4, e: 6, c: "yellow", k: "hl" },
  ]);
  chars = paint(chars, 0, 6, null, null);
  assert.deepEqual(fromChars(chars, "body").marks, []);
});

test("normalize trims and collapses a title per character, so colours stay on their letters", () => {
  // "  a   b \n" with "b" in red → "a b", red at index 2
  const chars = toChars("  a   b \n", [{ f: "title", s: 6, e: 7, c: "red", k: "fg" }], "title");
  const { chars: out, map } = normalize(chars, "title");
  assert.deepEqual(fromChars(out, "title"), { text: "a b", marks: [{ f: "title", s: 2, e: 3, c: "red", k: "fg" }] });
  assert.equal(map[6], 2); // old "b" → new index 2
  assert.equal(map[9], 3); // end of text → end of text
  // the body keeps its spaces and new lines, only trailing whitespace goes
  assert.equal(fromChars(normalize(toChars("a  b\n\n", [], "body"), "body").chars, "body").text, "a  b");
});

test("toHtml escapes text and wraps coloured runs", () => {
  const html = toHtml("<b> & c", [{ f: "body", s: 4, e: 7, c: "pink", k: "hl" }], "body");
  assert.equal(html, '&lt;b&gt; <span data-hl="pink">&amp; c</span>');
});
