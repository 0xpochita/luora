import type { ButtonHTMLAttributes } from "react";
import { tile } from "./tile";

/** Rounded-square icon tile; `active` turns it solid white. Always pass a `label` (aria + tooltip). */
export function IconButton({
  label,
  active = false,
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`${tile(active)} disabled:pointer-events-none disabled:opacity-40 ${size === "sm" ? "size-8 text-[14px]" : "size-9 text-[16px]"} ${className}`}
      {...props}
    />
  );
}
