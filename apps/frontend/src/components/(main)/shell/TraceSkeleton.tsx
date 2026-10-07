/** Suspense fallback while the server reads luora-data.json. */
export function TraceSkeleton() {
  return (
    <div className="flex flex-1">
      <div className="w-[272px] flex-none space-y-2 border-line border-r p-3">
        {Array.from({ length: 6 }, (_, i) => `sk-${i}`).map((k) => (
          <div key={k} className="h-8 animate-pulse bg-sel" />
        ))}
      </div>
      <div className="m-3 flex-1 animate-pulse border border-line bg-panel" />
      <div className="my-3 mr-3 w-[440px] animate-pulse border border-line bg-panel" />
    </div>
  );
}
