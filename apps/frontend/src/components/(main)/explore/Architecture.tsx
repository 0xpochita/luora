"use client";

import { useState } from "react";
import { PH, PhIcon } from "@/components/ui";
import {
  contractOf,
  EDGE_VERB,
  type Edge,
  type EdgeKind,
  githubUrl,
  type Protocol,
} from "@/features/explore";

/*
 * Architecture (docs/ux/explore.md, report pass). The old map drew every relation at once and
 * read as tangled cables; this answers one question at a time:
 *  - A1 pin/317574211247610337 (xchange, Architecture): the layers as columns of small typed
 *    boxes, a legend of the box types; relations as a tree with right-angle elbows, never curves
 *  - A2 pin/442126888432329740 (Product Architecture): one root on the left, its branches level
 *    by level, plain text labels
 *  - L2BEAT's contract pages (explore.md, L2): "can be called by", who may call what, inheritance
 * Pick a contract in the layers: its card, what it reaches (two levels, the second on demand),
 * what reaches it, and who may call its gated functions.
 */

const KIND_ORDER: EdgeKind[] = [
  "calls",
  "delegates",
  "uses",
  "holds",
  "deploys",
];
type Kind = "contract" | "library" | "outside";
const DOT: Record<Kind, string> = {
  contract: "bg-fg",
  library: "bg-dim",
  outside: "bg-blue",
};
const WORD: Record<Kind, string> = {
  contract: "Contract",
  library: "Library",
  outside: "Outside",
};

const kindOf = (p: Protocol, name: string): Kind => {
  const c = contractOf(p, name);
  if (c) return c.kind === "library" ? "library" : "contract";
  return "outside";
};
const out = (p: Protocol, name: string) =>
  p.edges
    .filter((e) => e.from === name && e.kind !== "inherits")
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));

function Members({ e }: { e: Edge }) {
  if (!e.members.length) return null;
  const shown = e.members.slice(0, 4);
  return (
    <span
      className="truncate font-mono text-[11.5px] text-dim"
      title={e.members.join(", ")}
    >
      {shown.join(", ")}
      {e.members.length > shown.length &&
        ` +${e.members.length - shown.length}`}
    </span>
  );
}

export function Architecture({
  p,
  selected,
  onSelect,
  onOpenLab,
}: {
  p: Protocol;
  selected: string;
  onSelect: (name: string) => void;
  onOpenLab: (name: string) => void;
}) {
  const groups = p.groups.map((g) => ({
    g,
    names: [
      ...p.contracts.filter((c) => c.group === g).map((c) => c.name),
      ...p.externals.filter((x) => x.group === g).map((x) => x.name),
    ],
  }));
  return (
    <div>
      {/* A1: the layers, each a column of typed boxes, and the legend */}
      <div className="flex items-center gap-4 text-[11.5px] text-dim">
        <span>Layers, in the order a call travels</span>
        <span className="ml-auto flex gap-3">
          {(Object.keys(WORD) as Kind[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full ${DOT[k]}`} />
              {WORD[k]}
            </span>
          ))}
        </span>
      </div>
      <div
        className="mt-2 grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))`,
        }}
      >
        {groups.map(({ g, names }) => (
          <div
            key={g}
            className="min-w-0 rounded-inner border border-border bg-inner-grad p-2"
          >
            <p className="truncate px-1 pb-1.5 text-[11.5px] text-dim">{g}</p>
            <div className="flex flex-col gap-1">
              {names.map((n) => {
                const on = n === selected;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onSelect(n)}
                    aria-pressed={on}
                    title={n}
                    className={`flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-left text-[12px] transition-colors ${on ? "bg-primary text-primary-fg" : "text-text hover:bg-raised"}`}
                  >
                    <span
                      className={`size-1.5 flex-none rounded-full ${on ? "bg-primary-fg" : DOT[kindOf(p, n)]}`}
                    />
                    <span className="truncate">{n}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Focus
        key={selected}
        p={p}
        name={selected}
        onSelect={onSelect}
        onOpenLab={onOpenLab}
      />
    </div>
  );
}

function Focus({
  p,
  name,
  onSelect,
  onOpenLab,
}: {
  p: Protocol;
  name: string;
  onSelect: (name: string) => void;
  onOpenLab: (name: string) => void;
}) {
  const c = contractOf(p, name);
  const ext = p.externals.find((x) => x.name === name);
  const kind = kindOf(p, name);
  const reaches = out(p, name);
  const reachedBy = p.edges.filter(
    (e) => e.to === name && e.kind !== "inherits",
  );
  const [open, setOpen] = useState<Set<string>>(new Set());
  const url = c ? githubUrl(p, c.repo, c.file, c.line) : null;

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div>
        {/* A2: the root, then its branches */}
        <div className="rounded-inner border border-border-strong bg-inner-grad px-4 py-3">
          <p className="flex items-center gap-2">
            <span className={`size-1.5 rounded-full ${DOT[kind]}`} />
            <span className="font-medium text-[14px] text-fg">{name}</span>
            <span className="text-[12px] text-dim">
              {c ? c.kind : WORD[kind]}
            </span>
            {c && (
              <button
                type="button"
                className="hdr-pill sm ml-auto"
                onClick={() => onOpenLab(name)}
                title="Its functions, storage, calls and events in the Atlas Lab"
              >
                <PhIcon d={PH.graph} className="size-[14px]" />
                Open in the Lab
              </button>
            )}
          </p>
          <p className="mt-1.5 text-[13px] text-body leading-relaxed">
            {c
              ? `${c.role}. ${c.summary}`
              : `${ext?.label}. ${ext?.summary ?? ""}`}
          </p>
          {c && (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
              <span>
                <span className="font-mono text-fg">{c.counts.entry}</span>{" "}
                entry points
              </span>
              <span>
                <span className="font-mono text-fg">{c.counts.functions}</span>{" "}
                functions
              </span>
              <span>
                <span className="font-mono text-fg">{c.counts.storage}</span>{" "}
                storage
              </span>
              <span>
                <span className="font-mono text-fg">{c.counts.events}</span>{" "}
                events
              </span>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11.5px] text-dim hover:text-fg"
                >
                  <PhIcon d={PH.code} className="size-[12px]" />
                  {c.file.split("/").pop()}:{c.line + 1}
                </a>
              )}
            </p>
          )}
        </div>
        <h3 className="mt-3 px-1 text-[12.5px] text-muted">
          What it reaches <span className="text-dim">{reaches.length}</span>
        </h3>
        {reaches.length ? (
          <Tree
            p={p}
            edges={reaches}
            open={open}
            onToggle={(n) =>
              setOpen((s) => {
                const x = new Set(s);
                if (!x.delete(n)) x.add(n);
                return x;
              })
            }
            onSelect={onSelect}
            root={name}
          />
        ) : (
          <p className="mt-1 px-1 text-[12.5px] text-dim">
            Nothing: it is reached, it reaches no one.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <section>
          <h3 className="px-1 text-[12.5px] text-muted">
            Reached by <span className="text-dim">{reachedBy.length}</span>
          </h3>
          <ul className="mt-1.5 overflow-hidden rounded-inner border border-border">
            {reachedBy.length ? (
              reachedBy.map((e) => (
                <li
                  key={`${e.from}-${e.kind}`}
                  className="border-border border-b last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => onSelect(e.from)}
                    className="flex w-full cursor-pointer flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-raised"
                  >
                    <span className="flex items-center gap-2 text-[12.5px]">
                      <span
                        className={`size-1.5 flex-none rounded-full ${DOT[kindOf(p, e.from)]}`}
                      />
                      <span className="truncate text-fg">{e.from}</span>
                      <span className="flex-none text-dim">
                        {EDGE_VERB[e.kind]} it
                      </span>
                    </span>
                    <span className="pl-3.5">
                      <Members e={e} />
                    </span>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-[12.5px] text-dim">
                No mapped contract reaches it: an entry point.
              </li>
            )}
          </ul>
        </section>
        {c && c.gated.length > 0 && (
          <section>
            <h3 className="px-1 text-[12.5px] text-muted">
              Who may call <span className="text-dim">{c.gated.length}</span>
            </h3>
            <ul className="mt-1.5 overflow-hidden rounded-inner border border-border">
              {c.gated.map((g) => (
                <li
                  key={g.fn}
                  className="flex items-center gap-2 border-border border-b px-3 py-1.5 text-[12.5px] last:border-b-0"
                >
                  <span className="truncate font-mono text-fg">{g.fn}</span>
                  <span className="ml-auto flex-none truncate text-muted">
                    {g.caller}
                  </span>
                  {g.by && (
                    <span className="flex-none font-mono text-[11px] text-dim">
                      {g.by}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        {c && c.bases.length > 0 && (
          <p className="px-1 text-[12.5px] text-muted">
            Inherits{" "}
            <span className="font-mono text-[12px] text-text">
              {c.bases.join(", ")}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

/** A1's elbows: a vertical stem, a short horizontal arm into each row. */
function Tree({
  p,
  edges,
  open,
  onToggle,
  onSelect,
  root,
  depth = 0,
}: {
  p: Protocol;
  edges: Edge[];
  open: Set<string>;
  onToggle: (name: string) => void;
  onSelect: (name: string) => void;
  /** names already on this branch, never expanded again */
  root: string;
  depth?: number;
}) {
  return (
    <ul className={depth ? "ml-[22px]" : "ml-2"}>
      {edges.map((e, i) => {
        const last = i === edges.length - 1;
        const next =
          depth === 0 ? out(p, e.to).filter((x) => x.to !== root) : [];
        const isOpen = open.has(e.to);
        return (
          <li key={`${e.to}-${e.kind}`} className="relative pl-6">
            <span
              aria-hidden="true"
              className={`absolute top-0 left-0 w-px bg-white/15 ${last ? "h-[19px]" : "h-full"}`}
            />
            <span
              aria-hidden="true"
              className="absolute top-[19px] left-0 h-px w-5 bg-white/15"
            />
            <div className="flex min-w-0 items-start gap-2 py-1.5">
              <span className="mt-px flex-none rounded border border-border bg-raised px-1.5 font-mono text-[10.5px] text-muted">
                {EDGE_VERB[e.kind]}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelect(e.to)}
                    title={`Select ${e.to}`}
                    className="inline-flex min-w-0 cursor-pointer items-center gap-1.5 text-[13px] text-fg hover:underline"
                  >
                    <span
                      className={`size-1.5 flex-none rounded-full ${DOT[kindOf(p, e.to)]}`}
                    />
                    <span className="truncate">{e.to}</span>
                  </button>
                  {e.manual && (
                    <span
                      className="flex-none text-[11px] text-yellow"
                      title={e.note ?? "Read by hand from the code"}
                    >
                      read by hand
                    </span>
                  )}
                  {next.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onToggle(e.to)}
                      aria-expanded={isOpen}
                      className="ml-auto flex-none cursor-pointer rounded px-1.5 text-[11.5px] text-dim hover:bg-raised hover:text-fg"
                    >
                      {isOpen ? "hide" : `reaches ${next.length}`}
                    </button>
                  )}
                </span>
                <Members e={e} />
              </span>
            </div>
            {isOpen && next.length > 0 && (
              <Tree
                p={p}
                edges={next}
                open={open}
                onToggle={onToggle}
                onSelect={onSelect}
                root={root}
                depth={depth + 1}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
