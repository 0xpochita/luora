import type { AskContext } from "../../ai/types";
import { SYSTEMS } from "../data/layers";
import type { AiQuestion, Piece, SystemKey } from "../types";
import type { AtlasModel } from "./model";

// Canned, defensive-only answers: the default when no AI provider is set, and the fallback when one fails.
const RISK_LABEL = {
  high: "High",
  med: "Medium",
  low: "Low",
  info: "Info",
} as const;

export const CHECKLIST: Record<SystemKey, string[]> = {
  entry: [
    "Who can call it? (anyone / owner / keeper)",
    "Does it make external calls before updating state (CEI)?",
    "Is there a reentrancy guard where external calls happen?",
    "Are token return values checked (SafeERC20)?",
  ],
  logic: [
    "Rounding direction and divide-by-zero cases",
    "Does it depend on a value that can change within one transaction?",
    "Are inputs from external contracts validated?",
  ],
  storage: [
    "Who writes this slot, and in what order relative to external calls?",
    "Can it reach an edge value (0, max) that breaks the math?",
  ],
  calls: [
    "What can the called contract do while it has control?",
    "Is the return value checked?",
    "Is the callee trusted, and why?",
  ],
  access: [
    "Which functions does this gate protect — and which are missing it?",
    "Is the privileged key a multisig / behind a timelock?",
  ],
  deps: [
    "What does the vault assume about this contract?",
    "What happens if it returns unexpected values or reverts?",
  ],
  events: ["Is the event emitted on every state change it describes?"],
  vulns: [
    "Confirm the root cause in code",
    "Write a test that fails today and passes after the fix",
  ],
};

const T_WITHDRAW = `// state must be updated before value leaves the vault
function test_withdraw_updatesSharesBeforeCall() public {
    vm.prank(alice); vault.deposit(1_000e6);
    vm.prank(alice); vault.withdraw(1_000e6);
    assertEq(vault.shares(alice), 0);
    assertEq(vault.totalShares(), 0);
}`;
const T_PRICE = `// share value should not move when only the spot price moves
function invariant_shareValueBounded() public view {
    uint256 v = vault.totalShares() == 0 ? 1e18
        : usdc.balanceOf(address(vault)) * 1e18 / vault.totalShares();
    assertApproxEqRel(v, 1e18, 0.01e18);
}`;
const T_DEFAULT = `// every share stays fully backed
function invariant_solvency() public view {
    assertGe(usdc.balanceOf(address(vault)), vault.totalShares());
}`;
const TESTS: Record<string, string> = {
  withdraw: T_WITHDRAW,
  f1: T_WITHDRAW,
  cCall: T_WITHDRAW,
  _price: T_PRICE,
  f2: T_PRICE,
  cPrice: T_PRICE,
  _computeShares: T_PRICE,
};

export function aiAnswer(
  { byId, findings: all }: AtlasModel,
  p: Piece,
  q: AiQuestion,
): string {
  const conns = (p.links ?? []).map((c) => byId[c]?.name).filter(Boolean);
  const findings =
    p.sys === "vulns" ? [p] : all.filter((x) => (x.links ?? []).includes(p.id));
  if (q === "explain")
    return `${p.name} lives in the "${SYSTEMS[p.sys].label}" system (${SYSTEMS[p.sys].sub}).\n\n${p.desc}\n\nConnected to: ${conns.join(", ") || "nothing else directly"}.`;
  if (q === "risks")
    return (
      `Checklist for ${p.name}:\n• ${CHECKLIST[p.sys].join("\n• ")}` +
      (findings.length
        ? `\n\nOpen findings here:\n${findings.map((f) => `⚠ ${f.name} (${RISK_LABEL[f.risk ?? "low"]}) — ${f.desc}`).join("\n")}`
        : "\n\nNo open findings on this piece.")
    );
  return `Foundry test to protect this behaviour (run with node luora-export.mjs, results show up in the trace view):\n\n${TESTS[p.id] ?? T_DEFAULT}`;
}

/** What a user's own AI provider gets for a piece: the same inputs the canned answer uses, plus its source lines. */
export function askContext(m: AtlasModel, p: Piece): AskContext {
  const from = m.lineOf(p);
  const findings =
    p.sys === "vulns"
      ? [p]
      : m.findings.filter((x) => (x.links ?? []).includes(p.id));
  return {
    contract: m.contract,
    file: m.file,
    piece: {
      name: p.name,
      system: SYSTEMS[p.sys].label,
      desc: p.desc,
      caller: p.caller,
    },
    source: {
      from: from + 1,
      lines: m.lines.slice(from, from + Math.min(p.n ?? 1, 120)),
    },
    connected: [...m.neighbours(p.id)]
      .filter((id) => id !== p.id && m.byId[id])
      .map((id) => ({
        name: m.byId[id].name,
        system: SYSTEMS[m.byId[id].sys].label,
      })),
    findings: findings.map((f) => ({
      name: f.name,
      risk: RISK_LABEL[f.risk ?? "low"],
      desc: f.desc,
    })),
    checklist: CHECKLIST[p.sys],
  };
}

export { RISK_LABEL };
