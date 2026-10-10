"use client";

import { motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Chevron, ENTER } from "@/components/ui";
import {
  aiReady,
  askStream,
  type ChatMessage,
  PROVIDERS,
  useAiConfig,
} from "@/features/ai";
import {
  type CallRange,
  type LuoraData,
  rangeLabel,
  selectionText,
  suggestions,
  type TestResult,
  traceAskPrompt,
} from "@/features/trace";
import { openAiSettings } from "../shell/AiSettings";

/*
 * Ask AI about calls (docs/ux/trace-view.md, "Ask AI"):
 *  - GitHub Copilot on a file: click a line, Shift-click another, ask about the lines between;
 *    predefined questions next to free text
 *  - Chrome DevTools "Debug with AI": the selected request is the chat's context, changed by
 *    selecting another; answers link back to what they name (here every #n selects that call)
 *  - R1 pin/372109987986003766 (Golo, AI chat in dark): suggested questions as a › list, the
 *    context as a strip on top of the composer, the model as a chip at its foot
 *  - R2 pin/160018593004593469 (21st.dev prompt input): two-tier composer, round white send
 *  - R3 pin/112871534413929668 (Julio Caggiano): the attached selection quoted in an inset strip
 *  - R4 pin/449445237837052121 (Onyekachi Mbaike, AI mode): the assistant as a tab of the side
 *    panel next to dense data, the question as a right-aligned bubble, the answer as plain text
 * The user's own AI, straight from this browser (features/ai); with none connected the send
 * button copies the question with its context, for any coding agent.
 */

export type Turn = {
  id: number;
  range: CallRange;
  question: string;
  /** what was sent for this turn (context + question) */
  prompt: string;
  answer: string;
  error?: string;
  done: boolean;
};

/** The conversation, kept by the trace page so it outlives the panel being closed. */
export function useAskThread() {
  const ai = useAiConfig();
  const [turns, setTurns] = useState<Turn[]>([]);
  const run = useRef<AbortController | null>(null);
  const ids = useRef(0);
  useEffect(() => () => run.current?.abort(), []);
  const patchLast = (p: Partial<Turn>) =>
    setTurns((ts) =>
      ts.map((t, i) => (i === ts.length - 1 ? { ...t, ...p } : t)),
    );

  const send = async (range: CallRange, question: string, prompt: string) => {
    run.current?.abort();
    const ctl = new AbortController();
    run.current = ctl;
    // earlier answered turns, then this one: the model sees the whole conversation
    const messages: ChatMessage[] = [
      ...turns
        .filter((t) => t.answer)
        .flatMap((t): ChatMessage[] => [
          { role: "user", content: t.prompt },
          { role: "assistant", content: t.answer },
        ]),
      { role: "user", content: prompt },
    ];
    setTurns((ts) => [
      ...ts.map((t) => ({ ...t, done: true })),
      { id: ++ids.current, range, question, prompt, answer: "", done: false },
    ]);
    let text = "";
    try {
      for await (const t of askStream(ai, messages, ctl.signal)) {
        text += t;
        patchLast({ answer: text });
      }
      if (!text) throw new Error("The model returned an empty answer.");
      patchLast({ done: true });
    } catch (e) {
      if (ctl.signal.aborted) return;
      patchLast({ error: (e as Error).message, done: true });
    }
  };
  const stop = () => {
    run.current?.abort();
    patchLast({ done: true });
  };
  const clear = () => {
    run.current?.abort();
    setTurns([]);
  };
  return {
    turns,
    busy: turns.at(-1)?.done === false,
    send,
    stop,
    clear,
  };
}
export type AskThread = ReturnType<typeof useAskThread>;

export function AskPanel({
  data,
  test,
  range,
  thread,
  focus,
  onRange,
}: {
  data: LuoraData;
  test: TestResult;
  range: CallRange | null;
  thread: AskThread;
  /** bumped to put the cursor in the composer (A, the row's Ask AI) */
  focus: number;
  onRange: (r: CallRange) => void;
}) {
  const ai = useAiConfig();
  const live = aiReady(ai);
  const frames = test.frames;
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const { turns, busy } = thread;
  const n = range ? range.to - range.from + 1 : 0;
  const what = n === 1 ? "this call" : `these ${n} calls`;

  useEffect(() => {
    if (focus) input.current?.focus();
  }, [focus]);
  // follow the answer as it streams, unless the reader scrolled up
  const last = turns.at(-1)?.answer.length;
  useEffect(() => {
    const el = scroller.current;
    if (
      el &&
      last != null &&
      el.scrollHeight - el.scrollTop - el.clientHeight < 120
    )
      el.scrollTop = el.scrollHeight;
  }, [last]);

  // a follow-up on the same calls doesn't send their context again
  const promptFor = (r: CallRange, q: string) => {
    const prev = turns.at(-1);
    return prev?.answer && prev.range.from === r.from && prev.range.to === r.to
      ? `${q}\nRefer to calls by their #number.`
      : traceAskPrompt(data, test, r, q);
  };
  const ask = async (q: string) => {
    const question = q.trim();
    if (!range || !question || busy) return;
    if (!live) {
      // no AI here: hand the question, with its context, to whatever agent the auditor uses
      try {
        await navigator.clipboard.writeText(
          traceAskPrompt(data, test, range, question),
        );
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
      return;
    }
    setDraft("");
    thread.send(range, question, promptFor(range, question));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        {turns.length === 0 ? (
          <motion.div {...ENTER} className="pt-1">
            <p className="text-[14px] text-fg">
              {range ? `Ask about ${what}` : "Pick a call to ask about"}
            </p>
            <p className="mt-1 text-[12.5px] text-muted leading-normal">
              Click a row to choose a call, Shift-click another to take every
              call between. The AI reads those calls, the lines they ran and the
              test.
            </p>
            {range && (
              <ul className="mt-3 rounded-inner border border-border bg-inner-grad p-1.5">
                {suggestions(frames, range).map((q) => (
                  <li key={q}>
                    <button
                      type="button"
                      onClick={() => {
                        if (live) return ask(q);
                        setDraft(q);
                        input.current?.focus();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-tile px-2.5 py-2 text-left text-[13px] text-body transition-colors hover:bg-raised hover:text-fg"
                    >
                      <Chevron />
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        ) : (
          turns.map((t) => (
            <motion.div key={t.id} {...ENTER} className="mt-4 first:mt-1">
              {/* R4: the question on the right, the calls it was about above it */}
              <div className="flex flex-col items-end">
                <button
                  type="button"
                  onClick={() => onRange(t.range)}
                  title="Select these calls again"
                  className="mb-1 font-mono text-[11px] text-dim hover:text-fg"
                >
                  {rangeLabel(t.range)}
                </button>
                <p className="max-w-[88%] whitespace-pre-wrap rounded-[14px] rounded-br-[6px] bg-raised px-3 py-2 text-[13px] text-fg">
                  {t.question}
                </p>
              </div>
              <div className="mt-3 text-[13px] text-body leading-relaxed">
                {t.answer ? (
                  <Answer
                    text={t.answer}
                    calls={frames.length}
                    onCall={(i) => onRange({ from: i, to: i })}
                  />
                ) : (
                  !t.done && (
                    <p className="flex items-center gap-2 text-dim">
                      <span className="size-1.5 animate-pulse rounded-full bg-fg" />
                      Reading{" "}
                      {t.range.to - t.range.from + 1 === 1
                        ? "the call"
                        : `${t.range.to - t.range.from + 1} calls`}{" "}
                      with {ai.model}…
                    </p>
                  )
                )}
                {t.error && (
                  <p className="mt-1 flex items-start gap-2 break-words text-[12.5px]">
                    <span className="mt-1.5 size-1.5 flex-none rounded-full bg-red" />
                    <span>
                      {PROVIDERS[ai.kind].label} failed: {t.error}
                    </span>
                  </p>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* R1 / R2 / R3: the context strip, the question, the model chip and send */}
      <div className="flex-none px-3 pb-3">
        {/* a click anywhere in the box but its buttons puts the cursor in the question, so a near
            miss never sends letters to the trace's shortcuts */}
        <div
          onPointerDown={(e) => {
            if (!(e.target as Element).closest("button, textarea")) {
              e.preventDefault();
              input.current?.focus();
            }
          }}
          className="cursor-text rounded-[16px] border border-border bg-inset p-1.5 transition-colors focus-within:border-border-strong"
        >
          <p className="flex items-center gap-2 rounded-[10px] bg-white/[.04] px-2.5 py-1.5 font-mono text-[11.5px] text-muted">
            <Chevron />
            <span className="truncate">
              {range ? selectionText(frames, range) : "No call selected"}
            </span>
          </p>
          <textarea
            ref={input}
            rows={2}
            value={draft}
            aria-label="Question about the selected calls"
            placeholder={range ? `Ask about ${what}` : "Select a call first"}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") return e.currentTarget.blur();
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                ask(draft);
              }
            }}
            className="block max-h-40 w-full resize-none bg-transparent px-2.5 pt-2 pb-1 text-[13px] text-fg leading-normal outline-none [field-sizing:content] placeholder:text-dim"
          />
          <div className="flex items-center gap-2 pr-0.5 pl-1">
            <button
              type="button"
              onClick={openAiSettings}
              title={live ? "Change your AI provider" : "Connect your own AI"}
              className={`flex h-7 min-w-0 items-center gap-1.5 rounded-full border px-2.5 text-[12px] transition-colors ${
                live
                  ? "border-white/[.08] text-body hover:text-fg"
                  : "border-white/20 text-fg hover:border-white/40"
              }`}
            >
              {live && (
                <span className="hdr-dot text-green" aria-hidden="true" />
              )}
              <span className="truncate">{live ? ai.model : "Connect AI"}</span>
            </button>
            {live ? (
              <button
                type="button"
                onClick={busy ? thread.stop : () => ask(draft)}
                disabled={!busy && (!draft.trim() || !range)}
                aria-label={busy ? "Stop the answer" : "Ask"}
                title={busy ? "Stop" : "Ask  ↵"}
                className="ml-auto grid size-8 flex-none place-items-center rounded-full bg-primary text-primary-fg transition-opacity disabled:opacity-35"
              >
                {busy ? (
                  <span className="size-2.5 rounded-[2px] bg-current" />
                ) : (
                  <Chevron className="size-[14px] -rotate-90 text-primary-fg" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => ask(draft)}
                disabled={!draft.trim() || !range}
                className="ml-auto h-8 flex-none rounded-full bg-primary px-3.5 font-medium text-[12.5px] text-primary-fg transition-opacity disabled:opacity-35"
              >
                {copied ? "Copied" : "Copy prompt"}
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 px-1 text-[11.5px] text-dim leading-normal">
          {live
            ? `Sends the selected calls, the lines they ran and the test name to ${PROVIDERS[ai.kind].label}, from this browser.`
            : copied
              ? "Copied with its context. Paste it into Claude Code, Cursor or any chat."
              : "No AI connected. Connect your own, or copy the question with its context for your coding agent."}
        </p>
      </div>
    </div>
  );
}

/** The answer as plain text, code fences as code, and every #n that names a call a link to it. */
function Answer({
  text,
  calls,
  onCall,
}: {
  text: string;
  calls: number;
  onCall: (i: number) => void;
}) {
  const out: ReactNode[] = [];
  let at = 0;
  for (const part of text.split(/\n?(```[\s\S]*?(?:```|$))\n?/)) {
    if (!part) continue;
    if (part.startsWith("```"))
      out.push(
        <pre
          key={at}
          className="my-2 overflow-x-auto rounded-tile border border-border bg-inset p-3 font-mono text-[12px] text-fg leading-relaxed"
        >
          {part.replace(/^```[^\n]*\n?/, "").replace(/```$/, "")}
        </pre>,
      );
    else
      for (const bit of part.split(/(#\d+)/)) {
        if (!bit) continue;
        const n = /^#(\d+)$/.exec(bit);
        const i = n ? Number(n[1]) : -1;
        out.push(
          i >= 0 && i < calls ? (
            <button
              key={at}
              type="button"
              onClick={() => onCall(i)}
              title={`Select call ${bit}`}
              className="font-mono text-fg underline decoration-white/30 decoration-dotted underline-offset-2 hover:decoration-white"
            >
              {bit}
            </button>
          ) : (
            <span key={at} className="whitespace-pre-wrap">
              {bit}
            </span>
          ),
        );
        at += bit.length;
      }
    if (part.startsWith("```")) at += part.length;
  }
  return <div>{out}</div>;
}
