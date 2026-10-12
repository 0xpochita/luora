"use client";

import { useSyncExternalStore } from "react";
import type { AiConfig } from "../types";
import { CLAUDE_HERE, NO_AI } from "../utils/provider";

const KEY = "luora.ai";
const EVENT = "luora-ai";

let raw: string | null = null;
let parsed: AiConfig = NO_AI;

function read(): AiConfig {
  let next: string | null = null;
  try {
    next = localStorage.getItem(KEY);
  } catch {}
  if (next !== raw) {
    raw = next;
    try {
      parsed = next ? { ...NO_AI, ...JSON.parse(next) } : NO_AI;
    } catch {
      parsed = NO_AI;
    }
    // "Your Claude" saved on a local Luora means nothing on the hosted one
    if (!CLAUDE_HERE && parsed.kind === "claude") parsed = NO_AI;
  }
  return parsed;
}

function subscribe(cb: () => void) {
  addEventListener("storage", cb);
  addEventListener(EVENT, cb);
  return () => {
    removeEventListener("storage", cb);
    removeEventListener(EVENT, cb);
  };
}

/** Saves the provider choice (and key) in this browser only. `NO_AI` removes it entirely. */
export function saveAiConfig(cfg: AiConfig) {
  try {
    if (cfg.kind === "none" && !cfg.key) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {}
  dispatchEvent(new Event(EVENT));
}

/** The user's AI provider, shared by the settings dialog and the Ask panel. */
export const useAiConfig = () =>
  useSyncExternalStore(subscribe, read, () => NO_AI);
