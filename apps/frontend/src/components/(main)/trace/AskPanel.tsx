"use client";

import {
  type CallRange,
  type LuoraData,
  parseRange,
  rangeLabel,
  rangeParam,
  selectionText,
  suggestions,
  type TestResult,
  traceAskPrompt,
} from "@/features/trace";
import { AiChat, type AiThread, useAiThread } from "../ai/AiChat";

/*
 * Ask AI about calls (docs/ux/trace-view.md, "Ask AI"): the app's chat (ai/AiChat) with the
 * selected calls as its context. Click a row, Shift-click another for a range; every #n in an
 * answer selects that call.
 */

export const useAskThread = useAiThread;
export type AskThread = AiThread;

const CALL = /(#\d+)/;

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
  const frames = test.frames;
  const n = range ? range.to - range.from + 1 : 0;
  const what = n === 1 ? "this call" : `these ${n} calls`;
  const callAt = (t: string) => {
    const i = Number(t.slice(1));
    return /^#\d+$/.test(t) && i < frames.length ? i : -1;
  };
  return (
    <AiChat
      thread={thread}
      context={range && { key: rangeParam(range), label: rangeLabel(range) }}
      strip={range ? selectionText(frames, range) : "No call selected"}
      suggestions={range ? suggestions(frames, range) : []}
      prompt={(q, followUp) =>
        !range
          ? q
          : followUp
            ? `${q}\nRefer to calls by their #number.`
            : traceAskPrompt(data, test, range, q)
      }
      link={{
        re: CALL,
        title: (t) => (callAt(t) >= 0 ? `Select call ${t}` : null),
        go: (t) => onRange({ from: callAt(t), to: callAt(t) }),
      }}
      onContext={(key) => {
        const r = parseRange(key);
        if (r) onRange(r);
      }}
      focus={focus}
      empty={{
        title: range ? `Ask about ${what}` : "Pick a call to ask about",
        hint: "Click a row to choose a call, Shift-click another to take every call between. The AI reads those calls, the lines they ran and the test.",
      }}
      placeholder={range ? `Ask about ${what}` : "Select a call first"}
      sends="the selected calls, the lines they ran and the test name"
    />
  );
}
