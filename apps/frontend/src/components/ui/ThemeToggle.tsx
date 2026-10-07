"use client";

import { useEffect, useState } from "react";

export const THEME_KEY = "luora-theme";

/** Inline, pre-hydration: apply the saved theme before first paint (no flash). */
export const themeScript = `try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(
    () => setDark(document.documentElement.classList.contains("dark")),
    [],
  );
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {}
    setDark(next);
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="grid size-[34px] place-items-center rounded-full bg-panel text-sm shadow-sh1"
    >
      {dark ? "☀" : "☾"}
    </button>
  );
}
