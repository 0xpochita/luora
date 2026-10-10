"use client";

import { useMemo } from "react";
import { askPrompt } from "@/features/ai";
import { type AtlasModel, aiAnswer, SYSTEMS } from "@/features/atlas";
import {
  askContext,
  CONTRACT_QUESTIONS,
  contractAskPrompt,
  PIECE_QUESTIONS,
} from "@/features/atlas/utils/ai";
import { AiChat, type AiThread } from "../ai/AiChat";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Ask AI in the Atlas (the app's chat, ai/AiChat): about the selected piece, or about the whole
 * contract when nothing is selected (DevTools: the selection is the context). Piece questions have
 * built-in answers when no AI is connected; deposit() or F-01 in an answer selects that piece.
 */
export function AtlasAsk({
  model,
  selected,
  thread,
  focus,
  onSelect,
}: {
  model: AtlasModel;
  selected: string | null;
  thread: AiThread;
  focus: number;
  onSelect: (id: string | null) => void;
}) {
  const p = selected ? model.byId[selected] : null;
  // names an answer can point at: functions as name(), findings as F-01
  const named = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of model.pieces)
      if (x.sys === "vulns") m.set(x.name.slice(0, 4), x.id);
      else if (x.name.endsWith("()")) m.set(x.name, x.id);
    return m;
  }, [model]);
  const re = useMemo(
    () =>
      new RegExp(
        `(${[...named.keys()]
          .sort((a, b) => b.length - a.length)
          .map(escapeRe)
          .join("|")})`,
      ),
    [named],
  );
  return (
    <AiChat
      thread={thread}
      context={
        p ? { key: p.id, label: p.name } : { key: "", label: model.contract }
      }
      strip={
        p
          ? `${p.name} · ${SYSTEMS[p.sys].label}`
          : `${model.contract} · the whole contract`
      }
      suggestions={p ? Object.keys(PIECE_QUESTIONS) : CONTRACT_QUESTIONS}
      prompt={(q, followUp) =>
        followUp
          ? q
          : p
            ? askPrompt(askContext(model, p), q)
            : contractAskPrompt(model, q)
      }
      builtIn={(q) =>
        p && PIECE_QUESTIONS[q] ? aiAnswer(model, p, PIECE_QUESTIONS[q]) : null
      }
      link={
        named.size
          ? {
              re,
              title: (t) => (named.has(t) ? `Select ${t}` : null),
              go: (t) => onSelect(named.get(t) ?? null),
            }
          : undefined
      }
      onContext={(key) => onSelect(key || null)}
      focus={focus}
      empty={{
        title: p ? `Ask about ${p.name}` : `Ask about ${model.contract}`,
        hint: "Select a card to ask about one piece, or ask about the whole contract. The AI reads the code, what it connects to, the findings and the coverage.",
      }}
      placeholder={p ? `Ask about ${p.name}` : "Ask about this contract"}
      sends={
        p
          ? "this piece's code, its connections and findings"
          : "the contract's source, its map, findings and coverage"
      }
    />
  );
}
