import type { ReactNode } from "react";

/**
 * R16 (pin 63543044738210889, 'Code Editor with AI Assistance'): the same window chrome around
 * every piece of product UI on the page: three grey dots, one tab with what is open, a dim note right.
 */
export function Window({
  tab,
  aside,
  children,
  className = "",
}: {
  tab: string;
  aside?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[18px] border border-white/[.09] bg-[#0d0d0f] shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)] ${className}`}
    >
      <div className="flex items-center gap-2 border-white/[.06] border-b px-4 py-2.5">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-white/[.12]" />
          <span className="size-2.5 rounded-full bg-white/[.12]" />
          <span className="size-2.5 rounded-full bg-white/[.12]" />
        </span>
        <span className="ml-4 truncate rounded-md bg-white/[.06] px-2.5 py-1 text-[12px] text-text">
          {tab}
        </span>
        {aside && (
          <span className="ml-auto hidden truncate pl-3 font-mono text-[11.5px] text-dim sm:block">
            {aside}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
