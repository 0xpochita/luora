/**
 * Suspense fallback while the server reads luora-data.json: the Trace's own layout, all three
 * panels starting on the same line (tests | trace with its title, toolbar and rows | side
 * panel), so nothing jumps when the page arrives.
 */
export function TraceSkeleton() {
  const card =
    "animate-pulse rounded-card border border-border bg-card-grad shadow-soft";
  const bar = "rounded-tile bg-raised";
  const ids = (n: number, p: string) =>
    Array.from({ length: n }, (_, i) => `${p}${i}`);
  return (
    <div className="flex min-h-0 flex-1 gap-3 px-3 pb-3">
      <div className={`w-[272px] flex-none space-y-2 p-2.5 ${card}`}>
        {ids(6, "t").map((k) => (
          <div key={k} className={`h-8 ${bar}`} />
        ))}
      </div>
      <div className={`flex min-w-0 flex-1 flex-col gap-3 p-5 ${card}`}>
        <div className={`h-6 w-1/3 ${bar}`} />
        <div className={`h-3 w-1/2 ${bar}`} />
        <div className={`mt-1 h-9 ${bar}`} />
        {ids(9, "r").map((k) => (
          <div key={k} className={`h-6 ${bar} opacity-60`} />
        ))}
      </div>
      <div className={`w-[440px] flex-none space-y-3 p-3 ${card}`}>
        <div className={`h-8 w-40 ${bar}`} />
        <div className={`h-9 ${bar}`} />
        <div className={`h-24 ${bar} opacity-60`} />
      </div>
    </div>
  );
}
