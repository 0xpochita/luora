import { Meter, Panel } from "@/components/ui";
import { type AtlasModel, LAYERS } from "@/features/atlas";

/** Pieces and findings per layer (shown under the source panel when nothing is selected). */
export function AtlasDashboard({ model }: { model: AtlasModel }) {
  const { findings, layerOf, pieces } = model;
  const mapped = pieces.filter((p) => p.sys !== "vulns");
  return (
    <Panel label="Layers" aside={`${mapped.length} pieces`}>
      {LAYERS.map((L) => {
        const n = mapped.filter((p) => layerOf(p) === L).length;
        const f = findings.filter((x) => layerOf(x) === L).length;
        return (
          <div
            key={L.key}
            className="grid grid-cols-[1fr_28px_60px_auto] items-center gap-3 border-line border-b px-3 py-2 last:border-b-0"
          >
            <span className="flex items-center gap-2 text-muted ui-label">
              <span className="size-2" style={{ background: L.color }} />
              {L.name}
            </span>
            <b className="font-light font-mono text-sm">
              {String(n).padStart(2, "0")}
            </b>
            <Meter value={n / mapped.length} className="w-full" />
            <span
              className={`whitespace-nowrap text-right ui-label ${f ? "text-bad" : "text-dim"}`}
            >
              {f ? `▲ ${f} finding${f > 1 ? "s" : ""}` : "Clear"}
            </span>
          </div>
        );
      })}
    </Panel>
  );
}
