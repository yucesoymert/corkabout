import {
  BookOpenText,
  Brain,
  Briefcase,
  Coffee,
  Compass,
  Globe,
  Leaf,
  Lightbulb,
  MusicNotes,
  Notebook,
  Palette,
  Planet,
  PuzzlePiece,
  Rocket,
  Sparkle,
  Translate,
} from "@phosphor-icons/react/dist/ssr"; // the ssr build has no React context, so it renders in server and client components

// Cover of a board on the dashboard. Boards that never picked one get an icon and tint from their id:
// random per board, the same on every visit.
export const BOARD_ICONS = {
  book: BookOpenText,
  brain: Brain,
  briefcase: Briefcase,
  coffee: Coffee,
  compass: Compass,
  globe: Globe,
  leaf: Leaf,
  lightbulb: Lightbulb,
  music: MusicNotes,
  notebook: Notebook,
  palette: Palette,
  planet: Planet,
  puzzle: PuzzlePiece,
  rocket: Rocket,
  sparkle: Sparkle,
  translate: Translate,
};
export const BOARD_TINTS = {
  sky: { bg: "#dbe7f3", fg: "#3d6a99" },
  sage: { bg: "#dde9dc", fg: "#4a7a4f" },
  peach: { bg: "#f6dfcf", fg: "#a5592f" },
  lavender: { bg: "#e5def3", fg: "#6a4f9c" },
  rose: { bg: "#f3dbe0", fg: "#a2445b" },
  butter: { bg: "#f2e8c4", fg: "#8a6d1c" },
  teal: { bg: "#d5ebe8", fg: "#2f7a72" },
};
export type BoardIcon = keyof typeof BOARD_ICONS;
export type BoardTint = keyof typeof BOARD_TINTS;
export const ICON_NAMES = Object.keys(BOARD_ICONS) as BoardIcon[];
export const TINT_NAMES = Object.keys(BOARD_TINTS) as BoardTint[];

/** The board's own picks, or the ones its id falls on. Unknown stored names fall back too. */
export function boardLook(b: { id: string; icon: string | null; color: string | null }) {
  const n = parseInt(b.id.slice(0, 8), 16); // uuid v4: these hex digits are random
  const icon = ICON_NAMES.includes(b.icon as BoardIcon) ? (b.icon as BoardIcon) : ICON_NAMES[n % ICON_NAMES.length];
  const color = TINT_NAMES.includes(b.color as BoardTint) ? (b.color as BoardTint) : TINT_NAMES[Math.floor(n / ICON_NAMES.length) % TINT_NAMES.length];
  return { icon, color, Icon: BOARD_ICONS[icon], tint: BOARD_TINTS[color] };
}
