import { Suspense } from "react";
import { AtlasWorkspace, RunSkeleton } from "@/components/(main)";
import { LUORA_DATA_EXPLICIT } from "@/config/env.server";
import { loadAtlas } from "@/features/atlas/services/load-atlas";

export const metadata = {
  title: "Contract Atlas",
  description:
    "Your contract as a graph of its functions, storage and calls, its findings on the pieces they touch, and a Lab that wires scenarios and exports them as Foundry tests.",
  alternates: { canonical: "/atlas" },
};

async function AtlasContent() {
  const source = await loadAtlas();
  return <AtlasWorkspace source={source} />;
}

export default function AtlasPage() {
  return (
    <Suspense
      fallback={<RunSkeleton view="atlas" local={LUORA_DATA_EXPLICIT} />}
    >
      <AtlasContent />
    </Suspense>
  );
}
