import Link from "next/link";
import type { ProtocolSummary } from "@/features/explore";
import { sourceLabel } from "@/features/explore";
import { ProtocolLogo } from "./ProtocolLogo";

/*
 * Explore gallery (docs/ux/explore.md):
 *  - P7 pin/915849274239380602 (NebulaDB integrations): a title, one line under it, the grid;
 *    nothing else on the page
 *  - P6 pin/92042386128336773 (Seventeen integrations): logo tile top-left, category top-right,
 *    name, a two-line purpose, a quiet footer
 *  - DeFiLlama's list: chain and category as plain words, no decoration
 * Numbers are counted from the AST (contracts, flows); nothing we did not measure (no TVL).
 */
export function ExploreGallery({ items }: { items: ProtocolSummary[] }) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-10">
      <div className="mx-auto w-full max-w-[1080px]">
        <h1 className="font-medium text-[15px] text-fg">Explore</h1>
        <p className="mt-1 max-w-[640px] text-[13px] text-muted leading-normal">
          Large DeFi protocols mapped from their own code at a pinned release:
          which contracts exist, how they call each other, and each business
          flow step by step. Ask your AI about any of it.
        </p>
        <ul className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                href={`/explore/${p.id}`}
                className="group flex h-full flex-col rounded-card border border-border bg-card-grad p-4 shadow-soft outline-none transition-colors hover:border-border-strong focus-visible:border-border-strong"
              >
                <span className="flex items-start gap-3">
                  <ProtocolLogo name={p.name} logo={p.logo} />
                  <span className="ml-auto text-[12.5px] text-dim">
                    {p.category}
                  </span>
                </span>
                <span className="mt-3 flex items-baseline gap-2">
                  <span className="font-medium text-[15px] text-fg">
                    {p.name}
                  </span>
                  <span className="text-[13px] text-muted">{p.version}</span>
                </span>
                <span className="mt-1.5 line-clamp-2 text-[13px] text-body leading-normal">
                  {p.purpose}
                </span>
                <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-[12.5px] text-muted">
                  <span>{p.chain}</span>
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
        </ul>
        <p className="mt-4 text-[12.5px] text-dim leading-normal">
          Not here yet: Curve (Vyper; the map reads solc ASTs) and Lido.
          Structure only means the licence (BUSL) keeps the code on GitHub:
          every function links to its line at the pinned commit.
        </p>
      </div>
    </main>
  );
}
