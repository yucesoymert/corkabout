// Card placement for the seed scripts: one column per tag, cards stacked in the order given.
export type SeedCard = { tag: string; title: string; body: string };

const WIDTH = 288; // 12 grid cells, see GRID in src/lib/canvas.ts
const GAP = 24;

// ponytail: card height guessed from text length (~42 chars per line at 300 px); a short guess overlaps, drag to tidy
const estimateHeight = (c: SeedCard) => {
  const lines = (s: string, perLine: number) => s.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / perLine)), 0);
  return 40 + 18 + lines(c.title, 32) * 21 + 8 + lines(c.body, 40) * 21;
};

/** x/y for every card: tags become columns, cards stack in their original order. */
export function layout(list: SeedCard[]) {
  const tags = [...new Set(list.map((c) => c.tag))];
  const bottoms = tags.map(() => 0);
  return list.map((c) => {
    const col = tags.indexOf(c.tag);
    const y = bottoms[col];
    bottoms[col] += Math.ceil((estimateHeight(c) + GAP) / GAP) * GAP; // stays on the grid
    return { ...c, x: col * (WIDTH + 2 * GAP), y, width: WIDTH, z: 0 };
  });
}
