import type { Piece } from "../types";

/** 24×24 stroke paths (fill none, stroke currentColor) for what a piece is in the code. */
export const ICON_PATH = {
  in: "M3 12h11M10 8l4 4-4 4M17 4h3v16h-3",
  out: "M10 12h11M17 8l4 4-4 4M7 4H4v16h3",
  cycle: "M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3M18 3v4h-4M6 21v-4h4",
  gear: "M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  pause: "M8 5v14M16 5v14",
  cylinder: "M5 6a7 3 0 1 0 14 0a7 3 0 1 0-14 0M5 6v12a7 3 0 0 0 14 0V6",
  grid: "M4 4h16v16H4zM4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16",
  plug: "M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5",
  antenna:
    "M12 12v10M8 22h8M10 10a2 2 0 1 0 4 0a2 2 0 1 0-4 0M7.8 5.8a6 6 0 0 0 0 8.4M16.2 5.8a6 6 0 0 1 0 8.4",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0",
  coin: "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0",
  waves:
    "M10 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2",
  warn: "M12 3L2 21h20zM12 10v5M12 17.5v.5",
  fn: "M8 4H5v16h3M16 4h3v16h-3",
  user: "M8 8a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4 21c0-4 4-6 8-6s8 2 8 6",
  check: "M5 12l5 5L20 7",
} as const;
export type IconKey = keyof typeof ICON_PATH;

/** Name-based rules for functions (entry + internal logic), first match wins. */
const FN_RULES: [RegExp, IconKey][] = [
  [/^_?set[A-Z_]|admin|owner|constructor|initiali[sz]e|config|upgrade/, "gear"],
  [/pause/i, "pause"],
  [/harvest|reward|claim|compound|accrue|rebase/i, "cycle"],
  [/deposit|mint|stake|receive|supply|repay/i, "in"],
  [/withdraw|redeem|transfer|send|burn|borrow|flash|payout/i, "out"],
  [/price|oracle|feed|quote/i, "eye"],
];

/** Pure mapping from a piece (system + name/target/member) to its icon. */
export function iconOf(p: Piece): IconKey {
  const text = [p.name, p.target, p.member].filter(Boolean).join(" ");
  switch (p.sys) {
    case "vulns":
      return "warn";
    case "storage":
      return p.mapping ? "grid" : "cylinder";
    case "events":
      return "waves";
    case "calls":
      return "plug";
    case "access":
      return /pause/i.test(text) ? "pause" : "lock";
    case "deps":
      if (/price|oracle|feed|aggregator/i.test(text)) return "eye";
      if (/token|erc20|erc721|usd|weth/i.test(text)) return "coin";
      return "antenna";
    default:
      return FN_RULES.find(([re]) => re.test(text))?.[1] ?? "fn";
  }
}
