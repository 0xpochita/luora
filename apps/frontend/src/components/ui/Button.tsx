import type { ButtonHTMLAttributes } from "react";

const VARIANTS = {
  primary: "bg-primary text-primary-fg shadow-soft hover:bg-white",
  secondary: "bg-raised text-fg hover:bg-hover",
  ghost: "text-muted hover:bg-hover hover:text-fg",
} as const;

const SIZES = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-4 text-[14px]",
} as const;

/** Rounded tile button. One `primary` (solid white) per area — the action that matters most. */
export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-tile outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet/60 disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}
