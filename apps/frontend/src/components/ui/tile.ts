/** Shared tile look: a separate rounded square/pill; active = solid white, idle = dark grey. */
export function tile(on: boolean) {
  return `inline-flex items-center justify-center gap-2 rounded-tile whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
    on
      ? "bg-primary text-primary-fg shadow-soft"
      : "bg-raised text-muted hover:bg-hover hover:text-fg"
  }`;
}
