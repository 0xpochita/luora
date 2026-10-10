"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui";
import { type AtlasModel, SYSTEMS } from "@/features/atlas";
import { SEVERITY } from "@/features/atlas/utils/audit";
import { unitCode } from "@/features/atlas/utils/units";
import { PieceIcon } from "./PieceIcon";

const OPEN = "luora-quick-search";
/** Opens the search from a button (the Atlas header's Search capsule). */
export const openQuickSearch = () => dispatchEvent(new Event(OPEN));

/** `/` or ⌘K: jump to any function, slot, call, event or finding by name or unit code. */
export function QuickSearch({
  model,
  onSelect,
}: {
  model: AtlasModel;
  onSelect: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest(
        "input, textarea, [contenteditable]",
      );
      const open =
        (e.key === "/" && !typing) ||
        (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey));
      if (!open || dialog.current?.open) return;
      e.preventDefault();
      setQ("");
      setAt(0);
      dialog.current?.showModal();
    };
    const onOpen = () => {
      if (dialog.current?.open) return;
      setQ("");
      setAt(0);
      dialog.current?.showModal();
    };
    addEventListener("keydown", onKey);
    addEventListener(OPEN, onOpen);
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener(OPEN, onOpen);
    };
  }, []);

  const needle = q.trim().toLowerCase();
  const hits = model.pieces
    .map((p) => ({
      p,
      code: unitCode(model, p.id),
      text:
        p.sys === "vulns"
          ? `${SEVERITY[p.risk ?? "low"]} · ${p.name.replace(/^F-\d+\s*/, "")}`
          : p.name,
    }))
    .filter(
      (h) =>
        !needle ||
        `${h.code} ${h.p.name} ${h.text} ${SYSTEMS[h.p.sys].label}`
          .toLowerCase()
          .includes(needle),
    )
    .slice(0, 12);
  const pick = (id: string | undefined) => {
    dialog.current?.close();
    if (id) onSelect(id);
  };

  return (
    <dialog
      ref={dialog}
      className="qsearch"
      aria-label="Jump to"
      onClick={(e) => e.target === dialog.current && pick(undefined)}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const n = Math.max(hits.length, 1);
          setAt((at + (e.key === "ArrowDown" ? 1 : n - 1)) % n);
        } else if (e.key === "Enter") pick(hits[at]?.p.id);
        else if (e.key === "Escape") e.stopPropagation(); // closes search, keeps the selection
      }}
    >
      <Input
        autoFocus
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setAt(0);
        }}
        placeholder="Jump to function, slot, call, event, finding…"
        aria-label="Search pieces"
        className="w-full"
      />
      <ul className="mt-1.5 flex max-h-[50vh] flex-col gap-0.5 overflow-auto">
        {hits.map((h, i) => (
          <li key={h.p.id}>
            <button
              type="button"
              aria-current={i === at}
              onMouseEnter={() => setAt(i)}
              onClick={() => pick(h.p.id)}
              className={`grid w-full grid-cols-[18px_56px_1fr_auto] items-center gap-2.5 rounded-tile px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                i === at ? "bg-hover text-fg" : "text-muted"
              }`}
            >
              <PieceIcon piece={h.p} />
              <span className="font-mono text-[12px] text-fg">{h.code}</span>
              <span
                className={`truncate ${h.p.sys === "vulns" ? "text-red" : ""}`}
              >
                {h.text}
              </span>
              <span className="text-[12.5px] text-dim">
                {SYSTEMS[h.p.sys].label}
              </span>
            </button>
          </li>
        ))}
        {!hits.length && (
          <li className="px-2.5 py-1.5 text-[13px] text-dim">No match</li>
        )}
      </ul>
    </dialog>
  );
}
