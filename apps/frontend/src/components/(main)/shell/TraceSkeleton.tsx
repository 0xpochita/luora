/** Suspense fallback while the server reads luora-data.json. */
export function TraceSkeleton() {
  const card =
    "animate-pulse rounded-card border border-border bg-card-grad shadow-soft";
  return (
    <div className="flex min-h-0 flex-1 gap-3 px-3 pb-3">
      <div className={`w-[272px] flex-none space-y-2 p-2.5 ${card}`}>
        {Array.from({ length: 6 }, (_, i) => `sk-${i}`).map((k) => (
          <div key={k} className="h-8 rounded-tile bg-raised" />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="h-8 flex-none" />
        <div className="flex min-h-0 flex-1 gap-3">
          <div className={`flex-1 ${card}`} />
          <div className={`w-[440px] flex-none ${card}`} />
        </div>
      </div>
    </div>
  );
}
