import { BOARD_ICONS, BOARD_TINTS, type BoardIcon, type BoardTint } from "@/lib/board-look";

// Dashboard tile cover: tint with the board's dot grid, icon in the middle. Used on the tile and in the edit preview.
export function BoardCover({ icon, color, className = "" }: { icon: BoardIcon; color: BoardTint; className?: string }) {
  const Icon = BOARD_ICONS[icon];
  const { bg, fg } = BOARD_TINTS[color];
  return (
    <div
      className={`grid aspect-[4/3] place-items-center rounded-2xl shadow-sm ring-1 ring-black/5 ${className}`}
      style={{ backgroundColor: bg, color: fg, backgroundImage: `radial-gradient(circle, ${fg}40 1px, transparent 1.3px)`, backgroundSize: "14px 14px", backgroundPosition: "7px 7px" }}
      aria-hidden
    >
      <span className="grid size-16 place-items-center rounded-2xl bg-white/80 shadow-sm">
        <Icon weight="duotone" className="size-8" />
      </span>
    </div>
  );
}
