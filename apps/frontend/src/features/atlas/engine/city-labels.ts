import type * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { findingGroups, rankOf, SEVERITY, shortTitle } from "../utils/audit";
import type { AtlasModel } from "../utils/model";

type Host = { pos: THREE.Vector3; top: number };

/**
 * One finding marker per building (`▲3` + highest severity and its short title) instead of a
 * stack of F-xx tags. The list of all findings opens on hover / when the building is selected;
 * each row picks that finding (full detail goes to the inspector).
 */
export function addFindingMarkers(
  scene: THREE.Scene,
  model: AtlasModel,
  hosts: Map<string, Host>,
  onPick: (id: string) => void,
) {
  const groups = new Map<string, HTMLDivElement>();
  for (const { host, findings } of findingGroups(model)) {
    const at = hosts.get(host);
    if (!at) continue;
    const top = findings[0];
    const el = document.createElement("div");
    el.className = `cfind sev-${top.risk ?? "low"}`;
    const head = document.createElement("button");
    head.type = "button";
    head.className = "head";
    const count = document.createElement("i");
    count.textContent = `▲${findings.length}`;
    const title = document.createElement("b");
    title.textContent = `${SEVERITY[top.risk ?? "low"]} · ${shortTitle(top)}`;
    head.append(count, title);
    head.onclick = () => onPick(top.id);
    const list = document.createElement("ul");
    for (const f of findings) {
      const li = document.createElement("li");
      const row = document.createElement("button");
      row.type = "button";
      row.className = `sev-${f.risk ?? "low"}`;
      row.textContent = `${f.name.slice(0, 4)} ${SEVERITY[f.risk ?? "low"]} · ${shortTitle(f, 44)}`;
      row.onclick = () => onPick(f.id);
      li.append(row);
      list.append(li);
    }
    el.append(list, head); // list opens upward, the head stays on its anchor
    el.dataset.prio = String(100 + rankOf(top) * 10);
    const o = new CSS2DObject(el);
    o.center.set(0.5, 1);
    o.position.set(at.pos.x, at.top + 2.2, at.pos.z);
    scene.add(o);
    groups.set(host, el);
  }
  return {
    els: groups,
    /** open the group on the selected / hovered building; dim the rest around a selection */
    refresh(
      selected: string | null,
      hovered: string | null,
      near: Set<string> | null,
      dismissed: Set<string> = new Set(),
    ) {
      for (const [host, el] of groups) {
        const mine = model.findings.filter((f) => model.lesion[f.id] === host);
        // every finding on this building triaged away (false positive / duplicate) → fade it
        el.classList.toggle(
          "dismissed",
          mine.every((f) => dismissed.has(f.id)),
        );
        const open =
          host === selected ||
          host === hovered ||
          mine.some((f) => f.id === selected);
        el.classList.toggle("open", open);
        el.classList.toggle(
          "dim",
          !!near &&
            !open &&
            !near.has(host) &&
            !mine.some((f) => near.has(f.id)),
        );
      }
    },
  };
}

/** `shift`: nudge upward instead of hiding; `keep`: never hidden (findings) */
export type Label = {
  el: HTMLElement;
  prio: number;
  shift?: boolean;
  keep?: boolean;
};

/**
 * Screen-space collision avoidance for CSS2D labels: highest priority is placed first; a lower
 * one that overlaps is first compacted, then nudged upward (if `shift`) or hidden (`.occl`) unless `keep`.
 * Run a few times a second.
 */
export function declutter(labels: Label[]) {
  const placed: DOMRect[] = [];
  const hit = (r: DOMRect) =>
    placed.some(
      (q) =>
        r.left < q.right + 2 &&
        r.right > q.left - 2 &&
        r.top < q.bottom + 2 &&
        r.bottom > q.top - 2,
    );
  for (const l of [...labels].sort((a, b) => b.prio - a.prio)) {
    l.el.classList.remove("occl", "compact");
    l.el.style.marginTop = "";
    let r = l.el.getBoundingClientRect();
    if (!r.width) continue; // hidden or behind the camera
    if (l.shift && hit(r)) {
      l.el.classList.add("compact"); // first drop the title, keep the ▲n
      r = l.el.getBoundingClientRect();
    }
    for (let k = 1; l.shift && hit(r) && k <= 3; k++) {
      l.el.style.marginTop = `${-k * (r.height + 4)}px`;
      r = l.el.getBoundingClientRect();
    }
    if (hit(r) && !l.keep) {
      l.el.style.marginTop = "";
      l.el.classList.add("occl");
      continue;
    }
    if (hit(r)) {
      // kept but still crowded: stay compact (▲n) on its own anchor rather than stacking up
      l.el.style.marginTop = "";
      r = l.el.getBoundingClientRect();
    }
    placed.push(r);
  }
}
