import { Pill } from "@/components/ui";
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
    <div className="mb-3.5 flex flex-wrap items-center gap-2.5 rounded-3xl border-[1.5px] border-trayline bg-tray px-3 py-2.5 text-[12.5px] text-muted">
      <Pill tone={pass ? "ok" : "bad"}>{pass ? "✓ PASS" : "✕ FAIL"}</Pill>
      <code className="rounded-xl bg-card px-2.5 py-1 font-mono text-ink text-xs shadow-sh1">
        {command}
      </code>
      <span>{test.file}</span>
      {test.reason && <span className="text-bad">{test.reason}</span>}
      <span className="ml-auto">
        exported {new Date(exportedAt).toLocaleString()}
      </span>
    </div>
  );
}
