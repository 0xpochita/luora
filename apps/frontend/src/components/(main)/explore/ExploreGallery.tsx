import Link from "next/link";
import { Chevron } from "@/components/ui";
import type { ProtocolSummary } from "@/features/explore";
import { MAP, sourceLabel } from "@/features/explore";
import { ProtocolLogo } from "./ProtocolLogo";

/*
 * Explore gallery (docs/ux/explore.md, "Gallery pass"):
 *  - L1 pin/339740365654699588 (Dribbble, shared screens list): one centred column, a title and
 *    one line above it; each item a raised row with its thumbnail on the left, name and meta in
 *    the middle, its counts on the right; the hovered row lifts
 *  - Q2 pin/137008013661144911 (iaroslove, bento feature cards): the thumbnail is a miniature of
 *    the real product; here each protocol's own map, from the same layout as its Map view
 * Numbers are counted from the AST; nothing we did not measure (no TVL).
 */
export function ExploreGallery({ items }: { items: ProtocolSummary[] }) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-10">
      <div className="mx-auto w-full max-w-[960px]">
        <h1 className="font-medium text-[15px] text-fg">Explore</h1>
        <p className="mt-1 max-w-[640px] text-[13px] text-muted leading-normal">
          Large DeFi protocols mapped from their own code at a pinned release:
          which contracts exist, how they call each other, and each business
          flow step by step. Ask your AI about any of it.
        </p>
        <ul className="mt-5 flex flex-col gap-2">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                href={`/explore/${p.id}`}
                className="group flex items-center gap-4 rounded-card border border-border bg-card-grad p-2 pr-5 shadow-soft outline-none transition-colors hover:border-border-strong focus-visible:border-border-strong"
              >
                {/* L1 thumbnail, Q2 miniature: the protocol's own map */}
                <MiniMap preview={p.preview} />
                <span className="min-w-0 flex-1 py-1">
                  <span className="flex items-center gap-2.5">
                    <ProtocolLogo name={p.name} logo={p.logo} size={28} />
                    <span className="font-medium text-[15px] text-fg">
                      {p.name}
                    </span>
                    <span className="truncate text-[13px] text-muted">
                      {p.version}
                    </span>
                    <span className="ml-auto flex-none text-[12.5px] text-dim">
                      {p.category}
                    </span>
                  </span>
                  <span className="mt-2 line-clamp-2 text-[13px] text-body leading-normal">
                    {p.purpose}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-x-2 text-[12.5px] text-muted">
                    {p.flowTitles.map((t, i) => (
                      <span key={t}>
                        {i > 0 && <span className="mr-2 text-dim">·</span>}
                        {t}
                      </span>
                    ))}
                  </span>
                </span>
                {/* L1: the counts on the right */}
                <span className="flex w-[148px] flex-none flex-col gap-1 border-border border-l pl-5 text-[12.5px] text-muted">
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
                <Chevron className="flex-none text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-fg" />
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12.5px] text-dim leading-normal">
          Not here yet: Curve (Vyper; the map reads solc ASTs) and Lido (solc
          0.4.24 with Aragon). Structure only means the licence (BUSL) keeps the
          code on GitHub: every function links to its line at the pinned commit.
        </p>
      </div>
    </main>
  );
}

/** The Map view's layout drawn small: cards as graphite blocks, wires as hairlines. */
function MiniMap({ preview: m }: { preview: ProtocolSummary["preview"] }) {
  const pad = 40;
  return (
    <span className="block w-[232px] flex-none self-stretch rounded-inner border border-border bg-canvas/60 px-2 py-2 dot-grid">
      <svg
        aria-hidden="true"
        viewBox={`${-pad} ${-pad} ${m.w + pad * 2} ${m.h + pad * 2}`}
        className="block h-full min-h-[116px] w-full"
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
