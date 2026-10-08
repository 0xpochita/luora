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
    <header className="flex h-8 flex-none items-center gap-2 px-1">
      <nav className="flex min-w-0 items-center gap-2 text-[13px] text-dim">
        <span>Foundry</span>
        <span>/</span>
        <span className="truncate font-mono text-fg text-xs">{crumb}</span>
      </nav>
      <div className="ml-auto flex items-center gap-1.5">
        {origin === "sample" && (
          <Chip tone="warn" dot>
            Sample data
          </Chip>
        )}
        <Chip>Tests {tests}</Chip>
        <Chip>Sources {sources}</Chip>
        <Chip tone="ok" dot>
          {forgeVersion}
        </Chip>
      </div>
    </header>
  );
}
