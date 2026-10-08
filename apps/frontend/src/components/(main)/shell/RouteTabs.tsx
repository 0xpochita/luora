"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tile } from "@/components/ui";

const ROUTES = [
  { href: "/trace", label: "Trace" },
  { href: "/atlas", label: "Atlas" },
] as const;

export function RouteTabs() {
  const path = usePathname();
  return (
    <nav className="flex gap-1.5">
      {ROUTES.map((r) => {
        const on = path.startsWith(r.href);
        return (
          <Link
            key={r.href}
            href={r.href}
            aria-current={on ? "page" : undefined}
            className={`${tile(on)} h-9 px-4 text-[14px]`}
          >
            {r.label}
          </Link>
        );
      })}
    </nav>
  );
}
