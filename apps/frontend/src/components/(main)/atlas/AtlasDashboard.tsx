import { Meter, Panel } from "@/components/ui";
import { type AtlasModel, LAYERS } from "@/features/atlas";

/** Pieces and findings per layer (shown under the source panel when nothing is selected). */
export function AtlasDashboard({ model }: { model: AtlasModel }) {
  const { findings, layerOf, pieces } = model;
  const mapped = pieces.filter((p) => p.sys !== "vulns");
  return (
    <Panel
      label="Layers"
      dot={findings.length ? "bad" : "ok"}
      aside={<span className="font-mono">{mapped.length} pieces</span>}
    >
      <div className="grid gap-2.5 px-4 pt-1 pb-4">
        {LAYERS.map((L) => {
          const n = mapped.filter((p) => layerOf(p) === L).length;
          const f = findings.filter((x) => layerOf(x) === L).length;
          return (
            <div
              key={L.key}
              className="grid grid-cols-[1fr_24px_64px_84px] items-center gap-3"
            >
              <span className="flex items-center gap-2 text-[13px] text-muted">
                <span className="size-1.5 flex-none rounded-full bg-port" />
                {L.name}
              </span>
              <span className="text-right font-mono text-fg text-xs">{n}</span>
              <Meter value={n / mapped.length} className="w-full" />
              <span
                className={`whitespace-nowrap text-right text-[12.5px] ${f ? "text-red" : "text-dim"}`}
              >
                {f ? (
                  <>
                    <span className="font-mono">{f}</span> finding
                    {f > 1 ? "s" : ""}
                  </>
                ) : (
                  "Clear"
                )}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
