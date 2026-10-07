import { type DisplayKind, KIND_ICON } from "@/features/trace";

/** Square map marker with the frame kind's glyph; reverts in red. */
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
      className={`grid flex-none place-items-center border font-mono ${dims} ${
        kind === "REVERT"
          ? "border-bad/70 bg-bad/10 text-bad"
          : "border-edge bg-tray text-tick"
      }`}
    >
      {KIND_ICON[kind]}
    </span>
  );
}
