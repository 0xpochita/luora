"use client";

import { useMemo } from "react";
import {
  type ExploreTarget,
  exploreAskPrompt,
  exploreSuggestions,
  type Protocol,
  targetLabel,
} from "@/features/explore";
import { AiChat, type AiThread } from "../ai/AiChat";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Ask AI in Explore: the app's chat (ai/AiChat, R1–R4 in docs/ux/trace-view.md) with the
 * selection as its context: the protocol, a flow step, or a contract. A contract named in an
 * answer selects it on the map. The AI gets the structure and the hand-written flows, never source.
 */
export function ExploreAsk({
  protocol: p,
  target,
  thread,
  focus,
  onTarget,
}: {
  protocol: Protocol;
  target: ExploreTarget;
  thread: AiThread;
  focus: number;
  onTarget: (t: ExploreTarget) => void;
}) {
  const re = useMemo(
    () =>
      new RegExp(
        `\\b(${p.contracts
          .map((c) => c.name)
          .sort((a, b) => b.length - a.length)
          .map(escapeRe)
          .join("|")})\\b`,
      ),
    [p],
  );
  const label = targetLabel(p, target);
  return (
    <AiChat
      thread={thread}
      context={{ key: JSON.stringify(target), label }}
      strip={label}
      suggestions={exploreSuggestions(p, target)}
      prompt={(q, followUp) => (followUp ? q : exploreAskPrompt(p, target, q))}
      link={{
        re,
        // only a whole contract name is a link; any other text stays text
        title: (t) =>
          p.contracts.some((c) => c.name === t) ? `Select ${t}` : null,
        go: (t) => onTarget({ kind: "contract", name: t }),
      }}
      onContext={(key) => onTarget(JSON.parse(key) as ExploreTarget)}
      focus={focus}
      empty={{
        title: `Ask about ${label}`,
        hint: "Select a contract on the map or a step in a flow to change what the AI reads. It gets the protocol's structure and the hand-written flows, never the source.",
      }}
      placeholder="Ask how it works or what to check"
      sends="the protocol map and the selection"
    />
  );
}
