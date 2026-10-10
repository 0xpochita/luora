import type { EdgeKind, Flow, Protocol, ProtocolSummary } from "../types";

/**
 * Pure logic for the Explore pages: gallery summary, GitHub links and a flow as a sequence
 * diagram (docs/ux/explore.md). Components in components/(main)/explore draw it.
 */

export function summarize(p: Protocol): ProtocolSummary {
  return {
    id: p.id,
    name: p.name,
    version: p.version,
    category: p.category,
    chain: p.chain,
    logo: p.logo,
    purpose: p.purpose,
    contracts: p.contracts.length,
    flows: p.flows.length,
    licenses: [
      ...new Set(p.contracts.map((c) => c.license ?? "unknown")),
    ].sort(),
    excerpts: p.contracts.filter((c) => c.excerpts).length,
    flowTitles: p.flows.map((f) => f.title),
    preview: hubPreview(p),
  };
}

/** what the hub's relations are shown first: the work it hands off, then what it calls */
const PREVIEW_ORDER: EdgeKind[] = [
  "delegates",
  "calls",
  "deploys",
  "uses",
  "holds",
];
const PREVIEW_ROWS = 5;

/** The first contract (the entry point) and the contracts it reaches, one row per target. */
export function hubPreview(p: Protocol): ProtocolSummary["preview"] {
  const hub = p.contracts[0];
  const by = new Map<string, EdgeKind[]>();
  for (const e of p.edges)
    if (e.from === hub.name && e.kind !== "inherits")
      by.set(e.to, [...(by.get(e.to) ?? []), e.kind]);
  const rank = (ks: EdgeKind[]) =>
    Math.min(...ks.map((k) => PREVIEW_ORDER.indexOf(k)));
  const out = [...by.entries()]
    .sort((a, b) => rank(a[1]) - rank(b[1]) || a[0].localeCompare(b[0]))
    .map(([to, ks]) => ({
      to,
      verb: PREVIEW_ORDER.filter((k) => ks.includes(k))
        .map((k) => EDGE_VERB[k])
        .join(" · "),
      outside: p.externals.some((e) => e.name === to),
    }));
  return {
    hub: hub.name,
    role: hub.role,
    out: out.slice(0, PREVIEW_ROWS),
    more: Math.max(0, out.length - PREVIEW_ROWS),
  };
}

/** "Structure only", "Source excerpts" or "Source for 4 of 14", from the per-file licences. */
export function sourceLabel(s: { contracts: number; excerpts: number }) {
  if (s.excerpts === 0) return "Structure only";
  if (s.excerpts === s.contracts) return "Source excerpts";
  return `Source for ${s.excerpts} of ${s.contracts}`;
}

/** The exact line on GitHub at the pinned commit, or null (vendored code, unknown repo). */
export function githubUrl(
  p: Pick<Protocol, "repos">,
  repo: string | null | undefined,
  file: string | undefined,
  line: number | undefined,
): string | null {
  const r = p.repos.find((x) => x.id === repo);
  if (!r || !file) return null;
  return `${r.url}/blob/${r.commit}/${file}${line != null ? `#L${line + 1}` : ""}`;
}

export const contractOf = (p: Protocol, name: string) =>
  p.contracts.find((c) => c.name === name);

/** Verb for an edge, read as "<from> <verb> <to>". */
export const EDGE_VERB: Record<EdgeKind, string> = {
  calls: "calls",
  delegates: "delegates to",
  uses: "uses",
  holds: "holds",
  deploys: "deploys",
  inherits: "is",
};
// ---------- flows as sequence diagrams ----------

export type SeqRole = "attacker" | "actor" | "protocol" | "library" | "outside";
export type SeqParty = { name: string; role: SeqRole; note: string };
export type SeqStep = {
  from: string;
  to: string;
  /** the function that ran; null for an action (starts, emit Swap, back in swap()) */
  fn: string | null;
  label?: string;
  say: string;
  /** a check that was missing here (Exploits) */
  breaks?: string;
  /** the function's line on GitHub at the pinned commit */
  link?: { href: string; text: string };
};

/**
 * A flow as a sequence diagram: parties in order of appearance, the actor first; each step a call
 * from `from` (written in the spec) to its lane. An event is its contract acting ("emit Swap"); a
 * step that returns to a function already on the stack is "back in" it.
 */
export function flowSequence(p: Protocol, f: Flow) {
  const names = [f.actor];
  const add = (n: string) => {
    if (!names.includes(n)) names.push(n);
  };
  const steps: SeqStep[] = f.steps.map((s, i) => {
    const from = s.from ?? f.steps[i - 1]?.lane ?? f.actor;
    add(from);
    add(s.lane);
    const url = githubUrl(p, s.repo, s.file, s.line);
    const link =
      url && s.file
        ? { href: url, text: `${s.file.split("/").pop()}:${(s.line ?? 0) + 1}` }
        : undefined;
    const base = { say: s.say, ...(link ? { link } : {}) };
    if (!s.fn)
      return {
        ...base,
        from: s.lane,
        to: s.lane,
        fn: null,
        label: i === 0 ? "starts" : "acts",
      };
    if (/^[A-Z]/.test(s.fn))
      return {
        ...base,
        from: s.lane,
        to: s.lane,
        fn: null,
        label: `emit ${s.fn}`,
      };
    const again = f.steps
      .slice(0, i)
      .some((x) => x.lane === s.lane && x.fn === s.fn);
    if (again)
      return {
        ...base,
        from: s.lane,
        to: s.lane,
        fn: null,
        label: `back in ${s.fn}()`,
      };
    return { ...base, from, to: s.lane, fn: s.fn };
  });
  const parties: SeqParty[] = names.map((name) => {
    const c = p.contracts.find((x) => x.name === name);
    if (c)
      return {
        name,
        role: c.kind === "library" ? "library" : "protocol",
        note: c.role,
      };
    const e = p.externals.find((x) => x.name === name);
    if (e) return { name, role: "outside", note: e.label };
    return {
      name,
      role: "actor",
      note: name === f.actor ? "Starts the flow" : "Another caller",
    };
  });
  return { parties, steps };
}
