import { Suspense } from "react";
import { TraceSkeleton, TraceWorkspace } from "@/components/(main)";
import { loadAtlas } from "@/features/atlas/services/load-atlas";
import { loadTrace } from "@/features/trace/services/load-trace";

export const metadata = { title: "Trace" };

async function TraceData() {
  const [source, atlas] = await Promise.all([loadTrace(), loadAtlas()]);
  return <TraceWorkspace source={source} atlas={atlas} />;
}

export default function TracePage() {
  return (
    <Suspense fallback={<TraceSkeleton />}>
      <TraceData />
    </Suspense>
  );
}
