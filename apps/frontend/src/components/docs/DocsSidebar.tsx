"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitHubMark } from "@/components/landing/GitHubMark";
import { XMark } from "@/components/landing/XMark";
import { GROUPS, hrefOf } from "@/features/docs/pages";
import { SearchButton } from "./DocsSearch";

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
 * The docs' left column (D1 onorca.dev/docs): a search box that opens the palette (⌘K), the groups
 * of pages, the page on screen as a quiet pill, where to follow the project at its foot. Below lg
 * it folds into the search box and one "Docs menu" disclosure above the page.
 */
export function DocsSidebar() {
  const path = usePathname();
  const list = (
    <nav aria-label="Docs" className="flex flex-col gap-5">
      {GROUPS.map((g) => (
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
    </nav>
  );

  return (
    <>
      <aside className="sticky top-6 hidden max-h-[calc(100dvh-48px)] w-[260px] flex-none flex-col gap-5 overflow-y-auto pb-6 lg:flex">
        <SearchButton />
        {list}
        <Follow />
      </aside>
      <div className="mb-3 lg:hidden">
        <SearchButton />
      </div>
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
