// Coloured parts of a card's title and body. The text itself stays plain (speech, focus mode and sorting use it);
// marks are ranges over it: [s, e) in UTF-16 units, like DOM offsets. One text colour (fg) and one highlight (hl)
// per character at most. Editing works per character, then runs are packed back into ranges.
export const COLORS = ["yellow", "green", "blue", "pink", "red"] as const;
export type Color = (typeof COLORS)[number];
export type Kind = "fg" | "hl";
export type MarkField = "title" | "body";
export type Mark = { f: MarkField; s: number; e: number; c: Color; k: Kind };
export type Char = { ch: string; fg?: Color; hl?: Color };

/** One field's text with its marks spread over the characters. */
export function toChars(text: string, marks: Mark[], f: MarkField): Char[] {
  const chars: Char[] = text.split("").map((ch) => ({ ch }));
  for (const m of marks) if (m.f === f) for (let i = Math.max(0, m.s); i < Math.min(m.e, chars.length); i++) chars[i][m.k] = m.c;
  return chars;
}

/** Back from characters to text + ranges, one range per run of the same colour. */
export function fromChars(chars: Char[], f: MarkField): { text: string; marks: Mark[] } {
  const marks: Mark[] = [];
  for (const k of ["fg", "hl"] as const) {
    let start = 0;
    for (let i = 1; i <= chars.length; i++) {
      if (i < chars.length && chars[i][k] === chars[start][k]) continue;
      const c = chars[start]?.[k];
      if (c) marks.push({ f, s: start, e: i, c, k });
      start = i;
    }
  }
  return { text: chars.map((c) => c.ch).join(""), marks };
}

/** The same clean-up the plain fields had (title: one line, single spaces, trimmed; body: no trailing
 * whitespace), done per character so colours stay on their letters. `map[i]` = new index of old index i. */
export function normalize(chars: Char[], f: MarkField): { chars: Char[]; map: number[] } {
  const out: Char[] = [];
  const map: number[] = [];
  for (const c of chars) {
    map.push(out.length);
    const ch = f === "title" && /\s/.test(c.ch) ? " " : c.ch;
    if (f === "title" && ch === " " && (!out.length || out.at(-1)!.ch === " ")) continue; // leading or repeated space
    out.push({ ...c, ch });
  }
  while (out.length && /\s/.test(out.at(-1)!.ch)) out.pop();
  map.push(out.length);
  return { chars: out, map: map.map((i) => Math.min(i, out.length)) };
}

/** Colour [s, e) with c (null = remove that kind; kind null = remove both). */
export function paint(chars: Char[], s: number, e: number, k: Kind | null, c: Color | null): Char[] {
  return chars.map((ch, i) => {
    if (i < s || i >= e) return ch;
    const next = { ...ch };
    for (const kind of k ? [k] : (["fg", "hl"] as const)) {
      if (c) next[kind] = c;
      else delete next[kind];
    }
    return next;
  });
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** HTML for a field: plain text, coloured runs in <span data-fg/data-hl> (styled in globals.css). */
export function toHtml(text: string, marks: Mark[], f: MarkField): string {
  const chars = toChars(text, marks, f);
  let html = "";
  for (let i = 0; i < chars.length; ) {
    const { fg, hl } = chars[i];
    let j = i;
    while (j < chars.length && chars[j].fg === fg && chars[j].hl === hl) j++;
    const run = escape(chars.slice(i, j).map((c) => c.ch).join(""));
    html += fg || hl ? `<span${fg ? ` data-fg="${fg}"` : ""}${hl ? ` data-hl="${hl}"` : ""}>${run}</span>` : run;
    i = j;
  }
  return html;
}

// ===== DOM side (browser only) =====

/** Characters of an edited field, colours read from the spans around them. Also turns a DOM point (a selection
 * end) into an index. <br> and block elements the browser may add count as "\n", like innerText. */
export function readField(el: HTMLElement) {
  const chars: Char[] = [];
  const starts = new Map<Node, number>(); // node → index where its text starts / ends
  const ends = new Map<Node, number>();
  const walk = (node: Node, fg?: Color, hl?: Color) => {
    if (node instanceof HTMLElement && node !== el && /^(DIV|P)$/.test(node.tagName) && chars.length) chars.push({ ch: "\n" });
    starts.set(node, chars.length);
    if (node.nodeType === Node.TEXT_NODE) for (const u of (node.textContent ?? "").split("")) chars.push({ ch: u, fg, hl });
    else if (node instanceof HTMLElement && node.tagName === "BR") chars.push({ ch: "\n" });
    else if (node instanceof HTMLElement) {
      const ownFg = (node.dataset.fg as Color | undefined) ?? fg;
      const ownHl = (node.dataset.hl as Color | undefined) ?? hl;
      node.childNodes.forEach((child) => walk(child, ownFg, ownHl));
    }
    ends.set(node, chars.length);
  };
  walk(el);
  /** Selection point → index: inside a text node by offset, inside an element before its offset-th child. */
  const at = (node: Node, offset: number) => {
    if (node.nodeType === Node.TEXT_NODE) return (starts.get(node) ?? 0) + offset;
    const child = node.childNodes[offset];
    return child ? (starts.get(child) ?? 0) : (ends.get(node) ?? chars.length);
  };
  return { chars, at };
}

/** Select [s, e) of a field's text again (after its HTML was replaced). */
export function selectRange(el: HTMLElement, s: number, e: number) {
  const point = (index: number): [Node, number] => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let seen = 0;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const len = n.textContent?.length ?? 0;
      if (index <= seen + len) return [n, index - seen];
      seen += len;
    }
    return [el, el.childNodes.length];
  };
  const range = document.createRange();
  range.setStart(...point(s));
  range.setEnd(...point(e));
  getSelection()?.removeAllRanges();
  getSelection()?.addRange(range);
}
