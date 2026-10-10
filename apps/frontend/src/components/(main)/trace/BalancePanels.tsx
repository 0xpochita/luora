import type { ReactNode } from "react";
import { Chevron, KV } from "@/components/ui";
import { human, netBalances, type Transfer } from "@/features/trace";

function Block({
  label,
  count,
  empty,
  children,
}: {
  label: string;
  count: number;
  empty: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-inner border border-border bg-inner-grad p-1.5">
      <header className="flex items-center px-2 pt-1 pb-1.5 text-[13px] text-fg">
        {label}
        <span className="ml-auto font-mono text-dim text-xs">{count}</span>
      </header>
      {count ? (
        children
      ) : (
        <p className="px-2 pb-2 text-dim ui-label">{empty}</p>
      )}
    </section>
  );
}

export function BalancePanels({ transfers }: { transfers: Transfer[] }) {
  const net = netBalances(transfers);
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <Block
        label="Token transfers"
        count={transfers.length}
        empty="No token transfers in this test."
      >
        <ul className="space-y-0.5 text-[12.5px]">
          {transfers.map((t, i) => (
            <li
              key={`${t.from}-${t.to}-${t.value}-${i.toString()}`}
              className="flex gap-3 rounded-chip px-2 py-1.5 hover:bg-raised"
            >
              <span className="font-mono text-dim text-xs">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex items-center gap-1.5">
                {t.from} <Chevron /> {t.to}
              </span>
              <span className="ml-auto font-mono text-xs">
                {human(t.value)} {t.token}
              </span>
            </li>
          ))}
        </ul>
      </Block>
      <Block
        label="Net balance change"
        count={net.length}
        empty="Balances unchanged (or mint only)."
      >
        <div className="space-y-0.5">
          {net.map(([addr, v]) => (
            <KV key={addr} k={addr} className="rounded-chip px-2 py-1.5">
              <span className={v > 0n ? "text-green" : "text-red"}>
                {v > 0n ? "+" : "−"}
                {human((v < 0n ? -v : v).toString())}
              </span>
            </KV>
          ))}
        </div>
      </Block>
    </div>
  );
}
