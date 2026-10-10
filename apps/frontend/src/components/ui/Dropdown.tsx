"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { PH, PhIcon } from "./PhIcon";

/*
 * The app's one dropdown, never the browser's (docs/ux/trace-view.md).
 *  D1 pin/27443878977076716: a dark rounded menu with a hairline border, icon + label items, the
 *     hovered item lifted with a small bar at its left edge, separators between groups.
 *  D2 pin/235876099228853235: the trigger as a capsule, a leading label, the value, an up-down
 *     caret at the end.
 * The menu is portalled (into the open <dialog> when the trigger sits in one, so it stays in the
 * top layer) and placed under the trigger, or above it when there is no room. Keyboard: ↑ ↓ Home
 * End move, Enter / Space pick, Esc closes, a letter jumps to the next option starting with it.
 */

export type DropdownOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** plain text for type-ahead when `label` is not a string */
  text?: string;
  icon?: ReactNode;
  disabled?: boolean;
  title?: string;
  /** options sharing a group are listed under its heading, in order */
  group?: string;
  /** quiet text at the item's right end, in the menu only (a chain id) */
  hint?: ReactNode;
};

const TRIGGER = {
  /** header-family capsule (header.css .hdr-pill) */
  pill: "hdr-pill sm",
  /** a form field */
  field:
    "inline-flex h-9 items-center gap-2 rounded-tile border border-border bg-inset px-3 text-[13px] text-[#f0f0f2] transition-colors hover:border-border-strong",
  /** a Lab card widget (lab.css .dd-card) */
  card: "dd-card",
  /** the right half of a split capsule (header.css .hdr-pill.split), which styles it */
  bare: "text-[12px] text-dim hover:text-fg",
  /** a small capsule in a composer's footer (the chat's model chip) */
  chip: "inline-flex h-7 items-center gap-1.5 rounded-full border border-white/[.08] px-2.5 text-[12px] text-body transition-colors hover:text-fg",
} as const;

export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  label,
  placeholder = "Choose…",
  ariaLabel,
  variant = "field",
  className = "",
  mono = false,
}: {
  value: T | "";
  options: DropdownOption<T>[];
  onChange: (v: T) => void;
  /** dim text before the value inside the trigger ("Depth") */
  label?: ReactNode;
  placeholder?: ReactNode;
  ariaLabel: string;
  variant?: keyof typeof TRIGGER;
  className?: string;
  mono?: boolean;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [box, setBox] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    width: number;
    up: boolean;
    host: Element;
  } | null>(null);
  const current = options.find((o) => o.value === value);
  const enabled = (i: number) => !!options[i] && !options[i].disabled;

  const place = () => {
    const el = trigger.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = innerHeight - r.bottom;
    const up = below < 240 && r.top > below;
    setBox({
      left: Math.min(r.left, innerWidth - Math.max(r.width, 180) - 8),
      ...(up ? { bottom: innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
      width: r.width,
      up,
      host: el.closest("dialog[open]") ?? document.body,
    });
  };
  const show = () => {
    place();
    const at = options.findIndex((o) => o.value === value);
    setActive(at >= 0 ? at : options.findIndex((o) => !o.disabled));
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };
  const pick = (i: number) => {
    if (!enabled(i)) return;
    onChange(options[i].value);
    close();
  };

  // focus the list when it opens; close on outside press, scroll (outside the menu) or resize
  useLayoutEffect(() => {
    if (open) list.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: Event) => {
      const t = e.target as Node;
      if (!trigger.current?.contains(t) && !list.current?.contains(t))
        close(false);
    };
    const away = () => close(false);
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("scroll", outside, true);
    window.addEventListener("resize", away);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("scroll", outside, true);
      window.removeEventListener("resize", away);
    };
  });

  const move = (from: number, dir: 1 | -1) => {
    for (let k = 1; k <= options.length; k++) {
      const i = (from + dir * k + options.length * 2) % options.length;
      if (enabled(i)) return i;
    }
    return from;
  };
  const onKey = (e: KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => setActive((a) => move(a, 1)),
      ArrowUp: () => setActive((a) => move(a, -1)),
      Home: () => setActive(move(-1, 1)),
      End: () => setActive(move(options.length, -1)),
      Enter: () => pick(active),
      " ": () => pick(active),
      Escape: () => close(),
      Tab: () => close(false),
    };
    const run = keys[e.key];
    if (run) {
      if (e.key !== "Tab") e.preventDefault();
      e.stopPropagation();
      return run();
    }
    // type-ahead: the next option whose text starts with the letter
    if (e.key.length === 1) {
      const ch = e.key.toLowerCase();
      for (let k = 1; k <= options.length; k++) {
        const i = (active + k) % options.length;
        const o = options[i];
        const t = (
          o.text ?? (typeof o.label === "string" ? o.label : "")
        ).toLowerCase();
        if (enabled(i) && t.startsWith(ch)) return setActive(i);
      }
    }
  };

  let lastGroup: string | undefined;
  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-label={ariaLabel}
        title={current?.title}
        onClick={() => (open ? close(false) : show())}
        onKeyDown={(e) => {
          if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
            show();
          }
        }}
        className={`${TRIGGER[variant]} min-w-0 cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${className}`}
      >
        {label != null && <span className="flex-none text-dim">{label}</span>}
        {current?.icon}
        <span
          className={`min-w-0 flex-1 truncate ${current ? "text-fg" : "text-dim"} ${mono ? "font-mono text-[12px]" : ""}`}
        >
          {current?.label ?? placeholder}
        </span>
        <PhIcon d={PH.caretUpDown} className="size-[13px] flex-none text-dim" />
      </button>
      {box &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={list}
                id={`${id}-list`}
                role="listbox"
                aria-label={ariaLabel}
                aria-activedescendant={
                  active >= 0 ? `${id}-o${active}` : undefined
                }
                tabIndex={-1}
                onKeyDown={onKey}
                initial={{ opacity: 0, y: box.up ? 6 : -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: box.up ? 4 : -4, scale: 0.98 }}
                transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
                style={{
                  left: box.left,
                  top: box.top,
                  bottom: box.bottom,
                  minWidth: Math.max(box.width, 180),
                  transformOrigin: box.up ? "bottom left" : "top left",
                }}
                className="fixed z-[100] max-h-[320px] max-w-[min(420px,calc(100vw-16px))] overflow-y-auto rounded-[14px] border border-white/[.09] bg-gradient-to-b from-[#1d1d20] to-[#141416] p-1.5 text-[13px] shadow-[0_18px_44px_-12px_rgba(0,0,0,.8)] outline-none"
              >
                {options.map((o, i) => {
                  const head =
                    o.group && o.group !== lastGroup ? o.group : null;
                  lastGroup = o.group;
                  const on = o.value === value;
                  return (
                    <div key={o.value}>
                      {head && (
                        <p className="mt-1.5 border-white/[.06] border-t px-2.5 pt-2 pb-1 text-[11.5px] text-dim">
                          {head}
                        </p>
                      )}
                      <div
                        id={`${id}-o${i}`}
                        role="option"
                        tabIndex={-1}
                        onKeyDown={onKey}
                        aria-selected={on}
                        aria-disabled={o.disabled || undefined}
                        title={o.title}
                        onPointerEnter={() => enabled(i) && setActive(i)}
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => pick(i)}
                        className={`relative flex h-8 items-center gap-2.5 rounded-[9px] px-2.5 ${
                          o.disabled
                            ? "cursor-not-allowed text-dim"
                            : "cursor-pointer text-text"
                        }`}
                      >
                        {/* D1: the lifted item and its left bar slide to the active option */}
                        {i === active && (
                          <motion.span
                            layoutId={`${id}-hl`}
                            transition={{
                              type: "spring",
                              stiffness: 700,
                              damping: 45,
                            }}
                            className="absolute inset-0 rounded-[9px] bg-white/[.07] shadow-[inset_2px_0_0_rgba(255,255,255,.75)]"
                          />
                        )}
                        {o.icon && <span className="relative">{o.icon}</span>}
                        <span
                          className={`relative min-w-0 flex-1 truncate ${on ? "text-fg" : ""} ${mono ? "font-mono text-[12px]" : ""}`}
                        >
                          {o.label}
                        </span>
                        {o.hint != null && (
                          <span className="relative flex-none pl-3 font-mono text-[11.5px] text-dim tabular-nums">
                            {o.hint}
                          </span>
                        )}
                        {on ? (
                          <PhIcon
                            d={PH.check}
                            className="relative size-[13px] flex-none text-fg"
                          />
                        ) : (
                          // hints line up whether or not their row is checked
                          o.hint != null && (
                            <span className="size-[13px] flex-none" />
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>,
          box.host,
        )}
    </>
  );
}
