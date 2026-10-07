import { type DisplayKind, KIND_ICON, KIND_TONE } from "@/features/trace";

export function KindIcon({
  kind,
  size = "md",
}: {
  kind: DisplayKind;
  size?: "sm" | "md" | "lg";
}) {
  const dims = {
    sm: "size-[22px] text-[11px]",
    md: "size-[30px] text-[13px]",
    lg: "size-[34px] text-[14px]",
  }[size];
  return (
    <span
      title={kind}
      className={`grid flex-none place-items-center rounded-full font-semibold text-[#1d1f27] dark:text-ink ${dims} ${KIND_TONE[kind]}`}
    >
      {KIND_ICON[kind]}
    </span>
  );
}
