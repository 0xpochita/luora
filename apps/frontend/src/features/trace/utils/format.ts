/** 20000000000 → "20,000e6", 1e18 → "1e18": fixed-point amounts the way auditors read them. */
export function human(value: string): string {
  if (!/^\d+$/.test(value)) return value;
  const n = BigInt(value);
  for (const [unit, suffix] of [
    [10n ** 18n, "e18"],
    [10n ** 6n, "e6"],
  ] as const) {
    if (n >= unit && n % (unit / 100n) === 0n) {
      return (Number((n * 100n) / unit) / 100).toLocaleString("en-US") + suffix;
    }
  }
  return Number(n).toLocaleString("en-US");
}

/** "from=alice, amount=1000" → [["from","alice"],["amount","1,000"]] */
export function splitArgs(args: string): [string, string][] {
  if (!args) return [];
  return args.split(/, (?=\w+=)/).map((kv) => {
    const i = kv.indexOf("=");
    return [kv.slice(0, i), human(kv.slice(i + 1))];
  });
}

export function testKind(kind: string | Record<string, unknown>): string {
  return typeof kind === "string" ? kind : (Object.keys(kind)[0] ?? "Unit");
}
