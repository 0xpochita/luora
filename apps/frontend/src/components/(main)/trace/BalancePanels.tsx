import { KV, Panel } from "@/components/ui";
import { human, netBalances, type Transfer } from "@/features/trace";

const Empty = ({ text }: { text: string }) => (
  <p className="px-3 py-3 text-dim hud-label">{text}</p>
);

export function BalancePanels({ transfers }: { transfers: Transfer[] }) {
  const net = netBalances(transfers);
  return (
    <div className="mt-3 grid grid-cols-2 gap-3">
      <Panel label="Token transfers" aside={transfers.length}>
        {transfers.length ? (
          <ul className="divide-y divide-line px-3 py-1 text-[12.5px]">
            {transfers.map((t, i) => (
              <li
                key={`${t.from}-${t.to}-${t.value}-${i.toString()}`}
                className="flex gap-3 py-2"
              >
                <span className="font-mono text-dim text-xs">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  {t.from} → {t.to}
                </span>
                <span className="ml-auto font-mono text-xs">
                  {human(t.value)} {t.token}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="No token transfers in this test." />
        )}
      </Panel>
      <Panel label="Net balance change" aside={net.length}>
        {net.length ? (
          <div className="divide-y divide-line px-3 py-1">
            {net.map(([addr, v]) => (
              <KV key={addr} k={addr} className="py-2">
                <span className={v > 0n ? "text-ok" : "text-bad"}>
                  {v > 0n ? "+" : "−"}
                  {human((v < 0n ? -v : v).toString())}
                </span>
              </KV>
            ))}
          </div>
        ) : (
          <Empty text="Balances unchanged (or mint only)." />
        )}
      </Panel>
    </div>
  );
}
