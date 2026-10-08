import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const FIELD =
  "h-9 rounded-tile border border-border bg-inset px-3 text-[14px] text-fg outline-none transition-colors placeholder:text-dim hover:border-border-strong focus:border-violet/50 focus:ring-2 focus:ring-violet/20";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${FIELD} ${className}`} {...props} />;
}

export function Select({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`${FIELD} cursor-pointer pr-8 ${className}`}
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
      className={`${FIELD} h-auto resize-y py-2 ${className}`}
      {...props}
    />
  );
}
