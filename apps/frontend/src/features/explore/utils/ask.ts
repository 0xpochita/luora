import type { ExploreTarget, Flow, Protocol } from "../types";
import { contractOf, EDGE_VERB, githubUrl } from "./protocol.ts";

/**
 * What Ask AI sends about a protocol, a flow (or one of its steps) or a contract: structure read
 * from the AST plus the hand-written roles and flows. Never source code: much of it is BUSL, and
 * the line links let the model's reader open the real code.
 */

const MAX_FNS = 40;

const repoLine = (p: Protocol) =>
  p.repos
    .map((r) => `${r.url} @ ${r.tag} (${r.commit.slice(0, 7)}), ${r.license}`)
    .join("; ");

function protocolBlock(p: Protocol): string {
  const contracts = p.contracts
    .map((c) => `- ${c.name} (${c.kind}, ${c.group}): ${c.role}. ${c.summary}`)
    .join("\n");
  const externals = p.externals
    .map((e) => `- ${e.name} (${e.label}): ${e.summary}`)
    .join("\n");
  const edges = p.edges
    .filter((e) => e.kind !== "inherits")
    .map(
      (e) =>
        `- ${e.from} ${EDGE_VERB[e.kind]} ${e.to}${e.members.length ? `: ${e.members.join(", ")}` : ""}`,
    )
    .join("\n");
  return `Protocol: ${p.name} ${p.version} (${p.category}, ${p.chain})
Source: ${repoLine(p)}
${p.about}

Contracts:
${contracts}

Outside contracts:
${externals || "none"}

How they connect (read from the AST):
${edges}`;
}

function flowBlock(p: Protocol, f: Flow, step?: number): string {
  const steps = f.steps
    .map((s, i) => {
      const at = s.fn ? `${s.lane}.${s.fn}` : s.lane;
      const url = githubUrl(p, s.repo, s.file, s.line);
      return `${i === step ? "→" : " "} ${i + 1}. ${at}: ${s.say}${url ? ` (${url})` : ""}`;
    })
    .join("\n");
  return `Flow: ${f.title}, started by the ${f.actor}. ${f.summary}
Steps${step != null ? " (→ marks the selected step)" : ""}:
${steps}
What an auditor checks on this flow:
${f.checks.map((c) => `- ${c}`).join("\n")}`;
}

function contractBlock(p: Protocol, name: string): string {
  const c = contractOf(p, name);
  if (!c) return `Contract: ${name} (outside the mapped set)`;
  const pieces = c.atlas.pieces;
  const fns = pieces.filter((x) => x.sys === "entry");
  const list = (xs: string[]) =>
    xs.length > MAX_FNS
      ? `${xs.slice(0, MAX_FNS).join(", ")} and ${xs.length - MAX_FNS} more`
      : xs.join(", ") || "none";
  const io = p.edges
    .filter((e) => e.kind !== "inherits" && (e.from === name || e.to === name))
    .map(
      (e) =>
        `- ${e.from} ${EDGE_VERB[e.kind]} ${e.to}${e.members.length ? `: ${e.members.join(", ")}` : ""}`,
    );
  return `Contract: ${c.name} (${c.kind}) in ${p.name} ${p.version}, ${c.file}, licence ${c.license ?? "unknown"}
Link: ${githubUrl(p, c.repo, c.file, c.line) ?? "none"}
Role: ${c.role}. ${c.summary}
Inherits: ${c.bases.join(", ") || "nothing"}
External and public functions (caller restriction in brackets): ${list(fns.map((x) => `${x.name}${x.caller && x.caller !== "anyone" ? ` [${x.caller}]` : ""}`))}
Storage: ${list(pieces.filter((x) => x.sys === "storage").map((x) => x.name.replace(/^slot \d+ · /, "")))}
Events: ${list(pieces.filter((x) => x.sys === "events").map((x) => x.name))}
Relations:
${io.join("\n") || "none"}`;
}

/** Short text for the composer's context strip. */
export function targetLabel(p: Protocol, t: ExploreTarget): string {
  if (t.kind === "contract") return `${p.name} › ${t.name}`;
  if (t.kind === "flow") {
    const f = p.flows.find((x) => x.id === t.flow);
    if (!f) return p.name;
    const s = t.step != null ? f.steps[t.step] : undefined;
    return s
      ? `${p.name} › ${f.title} › ${(t.step ?? 0) + 1}. ${s.fn ? `${s.lane}.${s.fn}` : s.lane}`
      : `${p.name} › ${f.title}`;
  }
  return `${p.name} ${p.version}`;
}

/** The user message: context about the target, then the question. */
export function exploreAskPrompt(
  p: Protocol,
  t: ExploreTarget,
  question: string,
): string {
  const parts = [protocolBlock(p)];
  if (t.kind === "flow") {
    const f = p.flows.find((x) => x.id === t.flow);
    if (f) parts.push(flowBlock(p, f, t.step));
  }
  if (t.kind === "contract") parts.push(contractBlock(p, t.name));
  return `<context>
${parts.join("\n\n")}
</context>

${question}`;
}

/** Starting questions, all defensive: how it works and what to check. */
export function exploreSuggestions(p: Protocol, t: ExploreTarget): string[] {
  if (t.kind === "contract")
    return [
      `What is ${t.name}'s job in ${p.name}?`,
      "Who can call its privileged functions, and what can they change?",
      "Which other contracts does it trust, and for what?",
      "What should an auditor check here first?",
    ];
  if (t.kind === "flow") {
    const f = p.flows.find((x) => x.id === t.flow);
    if (t.step != null && f?.steps[t.step])
      return [
        "What happens in this step, and why here?",
        "What state is read and written at this point?",
        "What should an auditor check in this step?",
      ];
    return [
      `Walk me through ${f?.title.toLowerCase() ?? "this flow"} step by step`,
      "Where does value move, and what is checked before it does?",
      "Which assumptions does this flow make about its inputs and prices?",
      "What should an integration that calls this flow check?",
    ];
  }
  return [
    `Explain ${p.name}'s business model from these contracts`,
    "Which contract holds the funds, and who can move them?",
    "Which roles and parameters can change the protocol, and how?",
    "What should I review first when auditing an integration with it?",
  ];
}
