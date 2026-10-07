import type { SystemKey } from "../types";
import type { AtlasModel } from "./model";

const PREFIX: Record<SystemKey, string> = {
  entry: "ENT",
  access: "GTE",
  logic: "LOG",
  storage: "SLT",
  calls: "CAL",
  deps: "EXT",
  events: "EVT",
  vulns: "F",
};

/** Map-marker style unit code, e.g. `ENT-02`, `SLT-05` (storage uses the real slot). */
export function unitCode(model: AtlasModel, id: string): string {
  const p = model.byId[id];
  if (!p) return id;
  if (p.sys === "vulns") return p.name.slice(0, 4);
  if (p.sys === "storage" && p.slot != null)
    return `SLT-${String(p.slot).padStart(2, "0")}`;
  const same = model.pieces.filter((q) => q.sys === p.sys);
  return `${PREFIX[p.sys]}-${String(same.indexOf(p) + 1).padStart(2, "0")}`;
}

export type UnitStatus = "finding" | "privileged" | "ok" | "missing";

/** Status chip for the unit list: findings first, then privileged / missing protections. */
export function unitStatus(model: AtlasModel, id: string): UnitStatus {
  const p = model.byId[id];
  if (p?.ghost) return "missing";
  if (model.hasFinding(id) || model.isLesionHost(id)) return "finding";
  if (p?.caller && p.caller !== "anyone") return "privileged";
  return "ok";
}
