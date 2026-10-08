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
    <div className="mb-3 flex flex-wrap items-center gap-2.5 rounded-tile bg-inset px-2 py-1.5 text-muted text-xs">
      <Chip tone={pass ? "ok" : "bad"} dot>
        {pass ? "Pass" : "Fail"}
      </Chip>
      <code className="rounded-chip bg-raised px-2 py-1 font-mono text-fg text-xs">
        {command}
      </code>
      <span className="font-mono">{test.file}</span>
      {test.reason && <span className="text-red">{test.reason}</span>}
      <span className="ml-auto pr-1 text-dim ui-label">
        Exported {new Date(exportedAt).toLocaleString()}
      </span>
    </div>
  );
}
