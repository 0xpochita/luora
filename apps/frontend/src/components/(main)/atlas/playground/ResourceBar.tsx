import type { Playground } from "@/features/atlas/hooks/usePlayground";

/**
 * RTS resource bar: what the current call moves. Values are symbolic (read off the source) unless
 * a test's trace is in use; nothing is invented, unknowns stay "—". No gas, no score.
 */
export function ResourceBar({ pg }: { pg: Playground }) {
  const d = pg.deltas;
  const slots = Object.entries(d?.writes ?? {});
  const shares = slots.find(([k]) => /total/i.test(k)) ?? slots[0];
  const items: { k: string; v: string; title?: string }[] = [
    {
      k: "Caller",
      v: pg.trace ? `${pg.caller} · ${pg.callerLabel}` : pg.caller,
    },
    {
      k: "Amount",
      v: pg.amountUsed ? pg.amountLabel : "unused",
      title: pg.amountUsed
        ? undefined
        : "this function takes no USDC amount parameter",
    },
    {
      k: "Caller USDC Δ",
      v: d?.caller ?? "—",
      title: "balance change of msg.sender in the asset token",
    },
    {
      k: "Vault USDC Δ",
      v: d?.vault ?? "—",
      title: "asset.balanceOf(vault) change (totalAssets)",
    },
    {
      k: shares ? shares[0] : "State",
      v: shares ? shares[1] : "—",
      title: slots.map(([k, x]) => `${k} ${x}`).join("\n") || undefined,
    },
    { k: "Gas", v: "free · what-if" },
  ];
  return (
    <div
      className="pg-res flex border border-line bg-shell/90"
      aria-live="polite"
    >
      <span className="flex items-center border-line border-r px-2.5 text-dim hud-label">
        {pg.trace ? `Trace · ${pg.trace.key}` : "Symbolic"}
      </span>
      {items.map((x) => (
        <span
          key={x.k}
          title={x.title}
          className="grid border-line border-r px-2.5 py-1 last:border-r-0"
        >
          <span className="text-[9.5px] text-dim hud-label">{x.k}</span>
          <span
            className={`max-w-[150px] truncate font-mono text-xs ${x.v.startsWith("−") ? "text-ink" : x.v.startsWith("+") ? "text-ok" : "text-muted"}`}
          >
            {x.v}
          </span>
        </span>
      ))}
    </div>
  );
}
