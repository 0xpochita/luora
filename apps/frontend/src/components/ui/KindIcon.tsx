import { type DisplayKind, KIND_ICON } from "@/features/trace";

/** Rounded marker with the frame kind's glyph; reverts in red. */
export function KindIcon({
  kind,
  size = "md",
}: {
  kind: DisplayKind;
  size?: "sm" | "md" | "lg";
}) {
  const dims = {
    sm: "size-[20px] text-[10px]",
    md: "size-[24px] text-[12px]",
    lg: "size-[28px] text-[13px]",
  }[size];
  return (
    <span
      title={kind}
      className={`grid flex-none place-items-center rounded-[7px] font-mono ${dims} ${
        kind === "REVERT" ? "bg-red/12 text-red" : "bg-raised text-muted"
      }`}
    >
      {KIND_ICON[kind]}
    </span>
  );
}
