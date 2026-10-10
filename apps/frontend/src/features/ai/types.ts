import type { AiQuestion } from "../atlas/types";

/** "none" = the built-in canned answers; everything else is the user's own provider. */
export type AiKind = "none" | "local" | "anthropic" | "openai" | "openrouter";

/** Kept only in this browser's localStorage (`luora.ai`). */
export type AiConfig = {
  kind: AiKind;
  /** OpenAI-compatible base, e.g. http://localhost:11434/v1 (local only; API providers use their fixed URL) */
  baseUrl: string;
  model: string;
  key: string;
};

/** What the Ask panel sends: the selected piece and what the canned answer already uses, nothing more. */
export type AskContext = {
  contract: string;
  file: string;
  piece: { name: string; system: string; desc: string; caller?: string };
  /** the piece's own source lines, numbered from 1 */
  source: { from: number; lines: string[] };
  connected: { name: string; system: string }[];
  findings: { name: string; risk: string; desc: string }[];
  checklist: string[];
};

export type { AiQuestion };
