import { ICON_PATH, iconOf, type Piece } from "@/features/atlas";

/** Monochrome glyph for what the piece is in the code (same as its city marker). */
export function PieceIcon({ piece }: { piece: Piece }) {
  const key = iconOf(piece);
  return (
    <span
      title={key}
      className={`grid size-6 flex-none place-items-center rounded-[7px] ${
        piece.sys === "vulns" ? "bg-raised text-red" : "bg-raised text-port"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-3.5 fill-none stroke-2 stroke-current [stroke-linecap:round] [stroke-linejoin:round]"
      >
        <path d={ICON_PATH[key]} />
      </svg>
    </span>
  );
}
