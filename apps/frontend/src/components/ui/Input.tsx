import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const FIELD =
  "h-9 border border-border px-3 text-[13px] text-[#f0f0f2] outline-none transition-colors placeholder:text-dim hover:border-border-strong focus:border-white/25";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`${FIELD} rounded-inner bg-field ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`${FIELD} select-caret cursor-pointer rounded-tile bg-inset pr-8 ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`${FIELD} h-auto resize-y rounded-inner bg-field py-2 ${className}`}
      {...props}
    />
  );
}
