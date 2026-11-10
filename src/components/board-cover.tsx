import { BOARD_ICONS, BOARD_TINTS, type BoardIcon, type BoardTint } from "@/lib/board-look";

// Dashboard tile cover: tint with the board's dot grid, icon in the middle. Used on the tile and in the edit preview.
export function BoardCover({ icon, color, className = "" }: { icon: BoardIcon; color: BoardTint; className?: string }) {
  const Icon = BOARD_ICONS[icon];
  const { bg, fg } = BOARD_TINTS[color];
  return (
    <div
      className={`grid aspect-[4/3] place-items-center rounded-2xl bg-(--tint-bg) text-(--tint-fg) shadow-sm ring-1 ring-black/5 dark:bg-[color-mix(in_oklab,var(--tint-fg)_30%,var(--color-paper))] dark:text-[color-mix(in_oklab,var(--tint-fg)_45%,white)] dark:ring-neutral-200 ${className}`}
      style={{ "--tint-bg": bg, "--tint-fg": fg, backgroundImage: `radial-gradient(circle, ${fg}40 1px, transparent 1.3px)`, backgroundSize: "14px 14px", backgroundPosition: "7px 7px" } as React.CSSProperties}
      aria-hidden
    >
      <span className="grid size-16 place-items-center rounded-2xl bg-white/80 shadow-sm">
        <Icon weight="duotone" className="size-8" />
      </span>
    </div>
  );
}
