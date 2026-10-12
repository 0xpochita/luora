"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GitHubMark } from "@/components/landing/GitHubMark";
import { XMark } from "@/components/landing/XMark";
import { GROUPS, hrefOf } from "@/features/docs/pages";

/** where to follow the project, at the foot of the page list */
function Follow() {
  const link =
    "flex items-center gap-2.5 rounded-tile px-2.5 py-1.5 text-[13.5px] text-muted transition-colors hover:text-fg";
  return (
    <div className="flex flex-col gap-0.5 border-border border-t pt-4">
      <a
        href="https://x.com/luorasec"
        target="_blank"
        rel="noopener noreferrer"
        className={link}
      >
        <XMark className="size-3.5 flex-none" />
        Follow @luorasec on X
      </a>
      <a
        href="https://github.com/0xpochita/luora"
        target="_blank"
        rel="noopener noreferrer"
        className={link}
      >
        <GitHubMark className="size-3.5 flex-none" />
        Star on GitHub
      </a>
    </div>
  );
}

/**
 * The docs' left column (D1 onorca.dev/docs): a search box (⌘K) over the groups of pages, the page
 * on screen as a quiet pill. Search narrows the list by a page's title, lead and headings. Below
 * lg it folds into one "Docs menu" disclosure above the page.
 */
export function DocsSidebar() {
  const path = usePathname();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);
  const needle = q.trim().toLowerCase();
  const groups = GROUPS.map((g) => ({
    ...g,
    pages: g.pages.filter(
      (p) =>
        !needle ||
        [p.title, p.lead, ...p.blocks.flatMap((b) => ("h2" in b ? [b.h2] : []))]
          .join(" ")
          .toLowerCase()
          .includes(needle),
    ),
  })).filter((g) => g.pages.length);

  const list = (
    <nav aria-label="Docs" className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-2.5 font-medium text-[13px] text-fg">
            {g.title}
          </p>
          <ul className="flex flex-col gap-0.5">
            {g.pages.map((p) => {
              const href = hrefOf(p);
              const on = path === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={on ? "page" : undefined}
                    className={`block rounded-tile px-2.5 py-1.5 text-[13.5px] transition-colors ${on ? "bg-white/[.07] text-fg" : "text-muted hover:text-fg"}`}
                  >
                    {p.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {!groups.length && (
        <p className="px-2.5 text-[13px] text-dim">Nothing matches “{q}”.</p>
      )}
    </nav>
  );

  return (
    <>
      <aside className="sticky top-6 hidden max-h-[calc(100dvh-48px)] w-[240px] flex-none flex-col gap-5 overflow-y-auto pb-6 lg:flex">
        <label className="flex h-9 items-center gap-2 rounded-tile border border-border bg-inset px-3 text-[13px] text-dim focus-within:border-border-strong">
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-3.5 flex-none"
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
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search docs"
            aria-label="Search docs"
            className="min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-dim"
          />
          <kbd className="rounded-[5px] border border-white/[.08] px-1.5 font-mono text-[11px]">
            ⌘K
          </kbd>
        </label>
        {list}
        <Follow />
      </aside>
      <details className="mb-6 rounded-inner border border-border bg-inner-grad lg:hidden">
        <summary className="cursor-pointer px-4 py-3 text-[14px] text-fg">
          Docs menu
        </summary>
        <div className="flex flex-col gap-5 border-border border-t px-2 py-4">
          {list}
          <Follow />
        </div>
      </details>
    </>
  );
}
