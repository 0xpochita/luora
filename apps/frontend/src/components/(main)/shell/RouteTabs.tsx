"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ROUTES = [
  { href: "/trace", label: "Trace" },
  { href: "/atlas", label: "Atlas" },
] as const;

export function RouteTabs() {
  const path = usePathname();
  return (
    <nav className="flex h-full">
      {ROUTES.map((r) => {
        const on = path.startsWith(r.href);
        return (
          <Link
            key={r.href}
            href={r.href}
            aria-current={on ? "page" : undefined}
            className={`-mb-px flex items-center border-b-2 px-5 transition-colors hud-label ${
              on
                ? "border-accent bg-linear-to-b from-transparent to-white/5 text-ink"
                : "border-transparent text-dim hover:text-muted"
            }`}
          >
            {r.label}
          </Link>
        );
      })}
    </nav>
  );
}
