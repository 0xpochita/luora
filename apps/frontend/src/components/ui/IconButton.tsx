import type { ButtonHTMLAttributes } from "react";
import { tile } from "./tile";

const SIZES = {
  xs: "size-6 text-[12px]",
  sm: "size-8 text-[14px]",
  md: "size-9 text-[16px]",
} as const;

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
  size?: "xs" | "sm" | "md";
}) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`${tile(active)} disabled:pointer-events-none disabled:opacity-40 ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}
