import { ICON_PATH, iconOf, type Piece } from "@/features/atlas";

/** Monochrome glyph for what the piece is in the code (same as its city marker). */
export function PieceIcon({ piece }: { piece: Piece }) {
  const key = iconOf(piece);
  return (
    <span className={`picon ${piece.sys}`} title={key}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={ICON_PATH[key]} />
      </svg>
    </span>
  );
}
