import type { DisplayKind, Frame } from "../types";

export function displayKind(f: Frame): DisplayKind {
  if (f.contract === "vm") return "VM";
  if (!f.ok) return "REVERT";
  return f.kind;
}

export const KIND_ICON: Record<DisplayKind, string> = {
  CALL: "↗",
  STATICCALL: "◎",
  DELEGATECALL: "⇄",
  CALLCODE: "⇄",
  CREATE: "＋",
  CREATE2: "＋",
  EVENT: "✦",
  VM: "⚙",
  REVERT: "✕",
};

/** Pastel bubble behind each kind's icon (Tailwind classes). */
export const KIND_TONE: Record<DisplayKind, string> = {
  CALL: "bg-sky",
  STATICCALL: "bg-mint",
  DELEGATECALL: "bg-lilac",
  CALLCODE: "bg-lilac",
  CREATE: "bg-mint",
  CREATE2: "bg-mint",
  EVENT: "bg-butter",
  VM: "bg-lilac",
  REVERT: "bg-peach",
};

export function edgeLabel(child: Frame): string {
  const k = displayKind(child);
  if (k === "EVENT") return "emits";
  if (k === "VM") return "cheatcode";
  if (k === "REVERT") return "reverts";
  return child.kind.toLowerCase();
}

/** Key/value rows shown inside a graph node. */
export function frameRows(
  f: Frame,
): { key: string; value: string; tone?: "ok" | "bad" }[] {
  const rows: { key: string; value: string; tone?: "ok" | "bad" }[] = [];
  if (f.args) {
    for (const kv of f.args.split(/, (?=\w+=)/)) {
      const i = kv.indexOf("=");
      rows.push({ key: kv.slice(0, i), value: kv.slice(i + 1) });
    }
  }
  if (f.ret)
    rows.push({
      key: f.ok ? "return" : "revert",
      value: f.ret,
      tone: f.ok ? "ok" : "bad",
    });
  return rows;
}
