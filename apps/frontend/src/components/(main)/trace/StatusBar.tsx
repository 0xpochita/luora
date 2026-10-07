import { Chip } from "@/components/ui";
import type { TestResult } from "@/features/trace";

export function StatusBar({
  test,
  command,
  exportedAt,
}: {
  test: TestResult;
  command: string;
  exportedAt: string;
}) {
  const pass = test.status === "Success";
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2.5 border border-line bg-tray px-3 py-2 text-muted text-xs">
      <Chip tone={pass ? "ok" : "bad"} dot>
        {pass ? "Pass" : "Fail"}
      </Chip>
      <code className="border border-line bg-card px-2 py-0.5 font-mono text-ink text-xs">
        {command}
      </code>
      <span className="font-mono">{test.file}</span>
      {test.reason && <span className="text-bad">{test.reason}</span>}
      <span className="ml-auto hud-label text-dim">
        Exported {new Date(exportedAt).toLocaleString()}
      </span>
    </div>
  );
}
