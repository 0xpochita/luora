import type { Transfer } from "../types";

/** Net token movement per address across one test. */
export function netBalances(transfers: Transfer[]): [string, bigint][] {
  const net = new Map<string, bigint>();
  for (const t of transfers) {
    const v = BigInt(t.value);
    net.set(t.from, (net.get(t.from) ?? 0n) - v);
    net.set(t.to, (net.get(t.to) ?? 0n) + v);
  }
  return [...net].filter(
    ([addr, v]) => v !== 0n && !addr.startsWith("0x00000000"),
  );
}
