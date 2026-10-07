import { Suspense } from "react";
import { AtlasWorkspace } from "@/components/(main)";
import { loadAtlas } from "@/features/atlas/services/load-atlas";

export const metadata = { title: "Contract Atlas" };

async function AtlasContent() {
  const source = await loadAtlas();
  return <AtlasWorkspace source={source} />;
}

export default function AtlasPage() {
  return (
    <Suspense fallback={null}>
      <AtlasContent />
    </Suspense>
  );
}
