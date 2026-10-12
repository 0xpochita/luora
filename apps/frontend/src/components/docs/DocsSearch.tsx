"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { anchorOf, type Block, GROUPS, hrefOf } from "@/features/docs/pages";

/** what a page or section says, as plain text to search in */
const textOf = (blocks: Block[]) =>
  blocks
    .flatMap((b) =>
      "p" in b
        ? [b.p]
        : "list" in b
          ? b.list
          : "steps" in b
            ? b.steps
            : "note" in b
              ? [b.note]
              : "table" in b
                ? b.table.rows.flat()
                : [],
    )
    .join(" ")
    .replace(/[`*[\]]|\(\/?[^)]*\)/g, "")
    .toLowerCase();

type Hit = { title: string; where: string; href: string; text: string };

/** every page, and every section of it, as one searchable entry */
const INDEX: Hit[] = GROUPS.flatMap((g) =>
  g.pages.flatMap((p) => {
    const href = hrefOf(p);
    const hits: Hit[] = [
      {
        title: p.title,
        where: g.title,
        href,
        text: `${p.lead} ${textOf(p.blocks)}`.toLowerCase(),
      },
    ];
    p.blocks.forEach((b, i) => {
      if (!("h2" in b)) return;
      const end = p.blocks.findIndex((x, j) => j > i && "h2" in x);
      hits.push({
        title: b.h2,
        where: `${g.title} › ${p.title}`,
        href: `${href}#${anchorOf(b.h2)}`,
        text: textOf(p.blocks.slice(i + 1, end < 0 ? undefined : end)),
      });
    });
    return hits;
  }),
);

/** the best matches: words in the title first, then in what the page says */
function search(q: string): Hit[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return INDEX.filter((h) => !h.href.includes("#"));
  return INDEX.map((h) => {
    const title = h.title.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (title.startsWith(w)) score += 6;
      // the page's own address names its subject ("bridge" → Run tests from the browser)
      else if (h.href.split("#")[0].includes(w)) score += 5;
      else if (title.includes(w)) score += 4;
      else if (h.where.toLowerCase().includes(w)) score += 2;
      else if (h.text.includes(w)) score += 1;
      else return null;
    }
    return { h, score };
  })
    .filter((x) => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 14)
    .map((x) => x.h);
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded-[5px] border border-white/[.08] bg-white/[.04] px-1.5 py-0.5 font-mono text-[11px] text-muted">
      {children}
    </kbd>
  );
}

/** a SearchButton asks the palette to open with this event */
const OPEN = "luora:docs-search";

/**
 * The docs' search: a SearchButton, or ⌘K / Ctrl+K anywhere on the docs, opens one palette in the
 * middle of the screen (Orca's Go to file…: a dimmed, blurred page behind, the input on top, the
 * matches as rows with where they live, Enter / Esc / ↑↓ at the foot).
 */
export function DocsSearch() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const hits = useMemo(() => search(q), [q]);

  const open = () => {
    setQ("");
    setAt(0);
    dialog.current?.showModal();
    requestAnimationFrame(() => input.current?.focus());
  };
  const go = (h: Hit | undefined) => {
    if (!h) return;
    dialog.current?.close();
    router.push(h.href);
  };
  useEffect(() => {
    addEventListener(OPEN, open);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else open();
      }
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener(OPEN, open);
      removeEventListener("keydown", onKey);
    };
  });
  // the highlighted row stays in view while the arrows move it
  useEffect(() => {
    dialog.current
      ?.querySelector(`[data-hit="${at}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [at]);

  return (
    <dialog
      ref={dialog}
      aria-label="Search docs"
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setAt((i) => Math.min(hits.length - 1, i + 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setAt((i) => Math.max(0, i - 1));
        } else if (e.key === "Enter") {
          e.preventDefault();
          go(hits[at]);
        }
      }}
      className="m-auto mt-[14vh] w-[min(720px,calc(100vw-32px))] overflow-hidden rounded-card border border-border bg-card-grad p-0 text-fg shadow-float backdrop:bg-black/60 backdrop:backdrop-blur-[3px]"
    >
      <label className="flex items-center gap-3 border-border border-b px-4">
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="size-4 flex-none text-dim"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14" strokeLinecap="round" />
        </svg>
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setAt(0);
          }}
          placeholder="Search docs…"
          aria-label="Search docs"
          className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-dim"
        />
      </label>
      <ul className="max-h-[min(440px,55vh)] overflow-y-auto p-2">
        {hits.map((h, i) => (
          <li key={h.href}>
            <button
              type="button"
              data-hit={i}
              onMouseMove={() => setAt(i)}
              onClick={() => go(h)}
              className={`flex w-full items-center gap-3 rounded-tile px-3 py-2 text-left ${i === at ? "bg-white/[.07]" : ""}`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="size-4 flex-none text-dim"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
              >
                {h.href.includes("#") ? (
                  <path d="M3 5.5h10M3 10.5h10M6.5 2.5l-1.5 11M11 2.5l-1.5 11" />
                ) : (
                  <path d="M4 1.5h5.5L12.5 4.5v10h-8.5zM9.5 1.5v3h3M6 8h5M6 11h4" />
                )}
              </svg>
              <span className="min-w-0 truncate text-[14.5px] text-fg">
                {h.title}
              </span>
              <span className="min-w-0 truncate text-[13px] text-dim">
                {h.where}
              </span>
            </button>
          </li>
        ))}
        {!hits.length && (
          <li className="px-3 py-6 text-center text-[14px] text-dim">
            Nothing matches “{q}”.
          </li>
        )}
      </ul>
      <div className="flex items-center justify-end gap-2 border-border border-t px-4 py-2.5 text-[12.5px] text-dim">
        <Kbd>Enter</Kbd>
        <span className="mr-2">Open</span>
        <Kbd>Esc</Kbd>
        <span className="mr-2">Close</span>
        <Kbd>↑↓</Kbd>
        <span>Move</span>
      </div>
    </dialog>
  );
}

/** a search box that opens the palette (the left column on wide screens, above the menu on phones) */
export function SearchButton() {
  return (
    <button
      type="button"
      onClick={() => dispatchEvent(new Event(OPEN))}
      className="flex h-11 w-full items-center gap-2.5 rounded-tile border border-border bg-inset px-3.5 text-left text-[14px] text-dim transition-colors hover:border-border-strong"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="size-4 flex-none"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <circle cx="7" cy="7" r="4.5" />
        <path d="M10.5 10.5L14 14" strokeLinecap="round" />
      </svg>
      <span className="flex-1">Search docs</span>
      <Kbd>⌘K</Kbd>
    </button>
  );
}
