import Link from "next/link";
import { Chevron } from "@/components/ui";
import type { ProtocolSummary } from "@/features/explore";
import { sourceLabel } from "@/features/explore";
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
    <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-10 pb-10">
      <div className="mx-auto w-full max-w-[960px]">
        {/* H1 pin/42854633948971517 (Slavik Bushko): an eyebrow pill, a large title, one line */}
        <p className="inline-flex h-7 items-center gap-2 rounded-full border border-border bg-raised px-3 text-[12.5px] text-muted">
          <span className="size-1.5 rounded-full bg-green" />
          {items.length} protocols · pinned releases · read from the AST
        </p>
        <h1 className="mt-4 font-medium text-fg text-ui-display">
          Explore DeFi protocols
        </h1>
        <p className="mt-3 max-w-[620px] text-[14px] text-body leading-relaxed">
          Each one mapped from its own code: which contracts exist, how they
          call each other, and every business flow step by step. Open one, then
          ask your AI about it.
        </p>
        <ul className="mt-7 flex flex-col gap-2">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                href={`/explore/${p.id}`}
                className="group flex items-center gap-4 rounded-card border border-border bg-card-grad p-2 pr-5 shadow-soft outline-none transition-colors hover:border-border-strong focus-visible:border-border-strong"
              >
                {/* L1 thumbnail: the entry contract and what it reaches, by name */}
                <HubPreview preview={p.preview} />
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

/**
 * The entry contract on the left, the contracts it reaches on the right, one wire each: the
 * protocol's first hop, readable at thumbnail size (names, not boxes).
 */
function HubPreview({ preview: m }: { preview: ProtocolSummary["preview"] }) {
  const rows = m.out.length + (m.more ? 1 : 0);
  const W = 260;
  const H = 136;
  const at = (i: number) => ((i + 0.5) * H) / rows;
  return (
    <span className="relative block w-[260px] flex-none self-stretch overflow-hidden rounded-inner border border-border bg-canvas/60 dot-grid">
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        {m.out.map((o, i) => (
          <path
            key={o.to}
            d={`M100,${H / 2} C124,${H / 2} 124,${at(i)} 146,${at(i)}`}
            fill="none"
            stroke="var(--wire)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            className="opacity-60 transition-opacity duration-300 group-hover:opacity-100"
          />
        ))}
      </svg>
      {/* the hub: graphite card, title and role */}
      <span className="absolute top-1/2 left-2.5 flex w-[90px] -translate-y-1/2 flex-col rounded-tile border border-border-strong bg-card-grad px-2 py-1.5 shadow-soft">
        <span
          className="truncate font-medium text-[11.5px] text-fg"
          title={m.hub}
        >
          {m.hub}
        </span>
        <span className="truncate text-[10.5px] text-dim">{m.role}</span>
      </span>
      {/* what it reaches */}
      <span className="absolute inset-y-0 right-2 left-[146px] flex flex-col justify-around py-1">
        {m.out.map((o) => (
          <span
            key={o.to}
            title={`${o.verb} ${o.to}`}
            className="flex h-[19px] items-center gap-1.5 rounded-[6px] border border-border bg-raised px-1.5 text-[10.5px] text-text"
          >
            <span
              className={`size-[5px] flex-none rounded-full ${o.outside ? "bg-blue" : "bg-port"}`}
            />
            <span className="truncate">{o.to}</span>
          </span>
        ))}
        {m.more > 0 && (
          <span className="px-1.5 text-[10.5px] text-dim">+{m.more} more</span>
        )}
      </span>
    </span>
  );
}
