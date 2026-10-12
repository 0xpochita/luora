import { Suspense } from "react";
import { AtlasWorkspace, RunSkeleton } from "@/components/(main)";
import { LUORA_DATA_EXPLICIT } from "@/config/env.server";
import { loadAtlas } from "@/features/atlas/services/load-atlas";

export const metadata = { title: "Contract Atlas" };

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
