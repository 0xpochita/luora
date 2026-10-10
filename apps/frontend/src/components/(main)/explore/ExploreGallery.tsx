import Link from "next/link";
import type { ProtocolSummary } from "@/features/explore";
import { MAP, sourceLabel } from "@/features/explore";
import { ProtocolLogo } from "./ProtocolLogo";

/*
 * Explore gallery (docs/ux/explore.md, "Gallery pass"):
 *  - Q1 pin/837880705720916025 (Naxion "Projects" grid): the section's title is the grid's first
 *    tile, so the grid reads as one block with no hole at the end
 *  - Q2 pin/137008013661144911 (iaroslove, bento feature cards): title and two lines on top, a
 *    live miniature of the real product in an inset below; here each protocol's own map, drawn
 *    from the same layout as its Map view
 *  - P6 pin/92042386128336773: logo tile top-left, category top-right
 * Numbers are counted from the AST; nothing we did not measure (no TVL).
 */
export function ExploreGallery({ items }: { items: ProtocolSummary[] }) {
  const total = (k: "contracts" | "flows") =>
    items.reduce((n, p) => n + p[k], 0);
  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-10">
      <ul className="mx-auto grid w-full max-w-[1180px] grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-3">
        {/* Q1: the heading as the first tile */}
        <li className="flex flex-col justify-between rounded-card p-5">
          <div>
            <h1 className="font-medium text-[15px] text-fg">Explore</h1>
            <p className="mt-2 text-[13px] text-body leading-relaxed">
              Large DeFi protocols mapped from their own code at a pinned
              release: which contracts exist, how they call each other, and each
              business flow step by step. Ask your AI about any of it.
            </p>
          </div>
          <p className="mt-6 flex gap-4 text-[12.5px] text-muted">
            <span>
              <span className="font-mono text-fg">{items.length}</span>{" "}
              protocols
            </span>
            <span>
              <span className="font-mono text-fg">{total("contracts")}</span>{" "}
              contracts
            </span>
            <span>
              <span className="font-mono text-fg">{total("flows")}</span> flows
            </span>
          </p>
        </li>

        {items.map((p) => (
          <li key={p.id}>
            <Link
              href={`/explore/${p.id}`}
              className="group flex h-full flex-col rounded-card border border-border bg-card-grad p-2 shadow-soft outline-none transition-colors hover:border-border-strong focus-visible:border-border-strong"
            >
              <span className="flex items-start gap-3 px-3 pt-3">
                <ProtocolLogo name={p.name} logo={p.logo} />
                <span className="min-w-0">
                  <span className="flex items-baseline gap-2">
                    <span className="font-medium text-[15px] text-fg">
                      {p.name}
                    </span>
                    <span className="truncate text-[13px] text-muted">
                      {p.version}
                    </span>
                  </span>
                  <span className="block text-[12.5px] text-dim">
                    {p.category} · {p.chain}
                  </span>
                </span>
              </span>
              <span className="mt-3 line-clamp-2 px-3 text-[13px] text-body leading-normal">
                {p.purpose}
              </span>

              {/* Q2: the protocol's own map, in miniature */}
              <MiniMap preview={p.preview} />

              <span className="flex flex-wrap gap-x-2 gap-y-1 px-3 pt-3 text-[12.5px] text-text">
                {p.flowTitles.map((t, i) => (
                  <span key={t}>
                    {i > 0 && <span className="mr-2 text-dim">·</span>}
                    {t}
                  </span>
                ))}
              </span>
              <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pt-3 pb-2 text-[12.5px] text-muted">
                <span>
                  <span className="font-mono text-fg">{p.contracts}</span>{" "}
                  contracts
                </span>
                <span>
                  <span className="font-mono text-fg">{p.flows}</span> flows
                </span>
                <span
                  className="inline-flex items-center gap-1.5"
                  title={`Licences: ${p.licenses.join(", ")}`}
                >
                  <span
                    className={`size-1.5 rounded-full ${p.excerpts ? "bg-green" : "bg-dim"}`}
                  />
                  {sourceLabel(p)}
                </span>
              </span>
            </Link>
          </li>
        ))}

        {/* the last tile says what is missing and why, instead of a hole in the grid */}
        <li className="flex flex-col justify-end rounded-card p-5 text-[12.5px] text-muted leading-relaxed">
          <p className="text-[13px] text-text">Not here yet</p>
          <p className="mt-1">
            Curve: its pools are Vyper, and the map reads solc ASTs. Lido: its
            core mixes solc 0.4.24 (Aragon) with 0.8.x.
          </p>
          <p className="mt-3">
            Structure only means the licence (BUSL) keeps the code on GitHub:
            every function links to its line at the pinned commit.
          </p>
        </li>
      </ul>
    </main>
  );
}

/** The Map view's layout drawn small: cards as graphite blocks, wires as hairlines. */
function MiniMap({ preview: m }: { preview: ProtocolSummary["preview"] }) {
  const pad = 40;
  return (
    <span className="mt-4 block rounded-inner border border-border bg-canvas/60 px-3 py-3 dot-grid">
      <svg
        aria-hidden="true"
        viewBox={`${-pad} ${-pad} ${m.w + pad * 2} ${m.h + pad * 2}`}
        className="block h-[150px] w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {m.wires.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="var(--wire)"
            strokeWidth={3}
            className="opacity-40 transition-opacity duration-300 group-hover:opacity-80"
          />
        ))}
        {m.nodes.map((n) => (
          <g key={`${n.x},${n.y}`}>
            <rect
              x={n.x}
              y={n.y + MAP.title}
              width={MAP.w}
              height={n.h - MAP.title}
              rx={18}
              fill="var(--raised)"
              stroke="var(--border-strong)"
              strokeWidth={3}
            />
            <rect
              x={n.x + 4}
              y={n.y + 6}
              width={MAP.w * 0.55}
              height={12}
              rx={6}
              fill={n.outside ? "var(--blue)" : "var(--port)"}
              opacity={n.outside ? 0.55 : 0.45}
            />
          </g>
        ))}
      </svg>
    </span>
  );
}
