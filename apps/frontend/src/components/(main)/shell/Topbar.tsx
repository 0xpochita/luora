import { Chip } from "@/components/ui";

export function Topbar({
  crumb,
  tests,
  sources,
  forgeVersion,
  origin,
}: {
  crumb: string;
  tests: number;
  sources: number;
  forgeVersion: string;
  origin: "local" | "sample";
}) {
  return (
    <header className="flex h-10 flex-none items-center gap-2 border-line border-b px-4">
      <nav className="flex min-w-0 items-center gap-2 text-dim hud-label">
        <span>Foundry</span>
        <span>/</span>
        <span className="truncate text-ink">{crumb}</span>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        {origin === "sample" && <Chip>Sample data</Chip>}
        <Chip>Tests {tests}</Chip>
        <Chip>Sources {sources}</Chip>
        <Chip tone="ok" dot>
          {forgeVersion}
        </Chip>
      </div>
    </header>
  );
}
