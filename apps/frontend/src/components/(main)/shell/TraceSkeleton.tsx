/** Suspense fallback while the server reads luora-data.json. */
export function TraceSkeleton() {
  return (
    <div className="flex flex-1 gap-0 p-2 pl-0">
      <div className="w-[272px] flex-none space-y-2 p-4">
        {Array.from({ length: 6 }, (_, i) => `sk-${i}`).map((k) => (
          <div key={k} className="h-8 animate-pulse rounded-xl bg-sel" />
        ))}
      </div>
      <div className="flex-1 animate-pulse rounded-l-[32px] bg-panel" />
      <div className="w-[440px] animate-pulse rounded-r-[32px] bg-panel opacity-80" />
    </div>
  );
}
