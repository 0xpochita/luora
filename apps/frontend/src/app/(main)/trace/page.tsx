import { Suspense } from "react";
import { RunSkeleton, TraceWorkspace } from "@/components/(main)";
import { LUORA_DATA_EXPLICIT } from "@/config/env.server";
import { loadAtlas } from "@/features/atlas/services/load-atlas";
import { loadTrace } from "@/features/trace/services/load-trace";

export const metadata = {
  title: "Trace",
  description:
    "Decoded Foundry traces: every call, event and cheatcode of a forge test, each frame on the source line and storage it touched, with a call graph per test.",
  alternates: { canonical: "/trace" },
};

async function TraceData() {
  const [source, atlas] = await Promise.all([loadTrace(), loadAtlas()]);
  return <TraceWorkspace source={source} atlas={atlas} />;
}

export default function TracePage() {
  return (
    <Suspense
      fallback={<RunSkeleton view="trace" local={LUORA_DATA_EXPLICIT} />}
    >
      <TraceData />
    </Suspense>
  );
}
