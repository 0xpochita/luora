import { Pill, ThemeToggle } from "@/components/ui";

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
    <header className="flex h-[60px] flex-none items-center gap-2.5 pt-3.5 pr-4 pl-1.5">
      <nav className="flex gap-1.5 text-[12.5px]">
        <span className="rounded-full px-3 py-1.5 text-muted">Luora</span>
        <span className="rounded-full px-3 py-1.5 text-muted">Foundry</span>
        <span className="rounded-full bg-panel px-3 py-1.5 shadow-sh1">
          {crumb}
        </span>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        {origin === "sample" && <Pill>sample data</Pill>}
        <Pill mono>{tests} tests</Pill>
        <Pill mono>{sources} source files</Pill>
        <Pill mono className="text-ok!">
          ● {forgeVersion}
        </Pill>
        <ThemeToggle />
      </div>
    </header>
  );
}
