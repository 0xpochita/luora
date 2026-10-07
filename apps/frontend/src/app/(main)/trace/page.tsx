import { Suspense } from "react";
import { TraceSkeleton, TraceWorkspace } from "@/components/(main)";
import { loadTrace } from "@/features/trace/services/load-trace";

export const metadata = { title: "Trace" };

async function TraceData() {
  const source = await loadTrace();
  return <TraceWorkspace source={source} />;
}

export default function TracePage() {
  return (
    <Suspense fallback={<TraceSkeleton />}>
      <TraceData />
    </Suspense>
  );
}
