import type { ReactNode } from "react";
import { Tray, TrayCard } from "@/components/ui";
import { human, netBalances, type Transfer } from "@/features/trace";

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Tray>
      <h4 className="mx-3 mt-2 mb-2.5 font-semibold text-sm tracking-tight">
        {title}
      </h4>
      <TrayCard className="px-3.5 py-1.5">{children}</TrayCard>
    </Tray>
  );
}

const Empty = ({ text }: { text: string }) => (
  <p className="py-2.5 text-[12.5px] text-muted">{text}</p>
);

export function BalancePanels({ transfers }: { transfers: Transfer[] }) {
  const net = netBalances(transfers);
  return (
    <div className="mt-3.5 grid grid-cols-2 gap-3.5">
      <Panel title="Token transfers">
        {transfers.length ? (
          <ul className="divide-y divide-line text-[12.5px]">
            {transfers.map((t, i) => (
              <li
                key={`${t.from}-${t.to}-${t.value}-${i.toString()}`}
                className="flex gap-3 py-2.5"
              >
                <span className="text-dim">[{i + 1}]</span>
                <span>
                  {t.from} → {t.to}
                </span>
                <span className="ml-auto font-medium font-mono text-xs">
                  {human(t.value)} {t.token}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="No token transfers in this test." />
        )}
      </Panel>
      <Panel title="Net balance change">
        {net.length ? (
          <ul className="divide-y divide-line text-[12.5px]">
            {net.map(([addr, v]) => (
              <li key={addr} className="flex py-2.5">
                {addr}
                <span
                  className={`ml-auto font-medium font-mono text-xs ${v > 0n ? "text-ok" : "text-bad"}`}
                >
                  {v > 0n ? "+" : "−"}
                  {human((v < 0n ? -v : v).toString())}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="Balances unchanged (or mint only)." />
        )}
      </Panel>
    </div>
  );
}
