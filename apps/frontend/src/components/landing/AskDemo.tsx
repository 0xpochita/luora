"use client";

import dynamic from "next/dynamic";
import { loadAtlas, useAtlas } from "./atlas";
import { Lazy } from "./motion";

/**
 * R16 (pin 63543044738210889, 'Code Editor with AI Assistance'): one editor window, code left, an
 *   assistant panel right with the user's question as a bubble and a structured answer.
 * R17 (pin 51158145762280588, IDE + 'New Chat'): inline diagnostics on code lines, a 'thinking'
 *   row, a prompt bar with a context chip at the bottom.
 * R18 (pin 58546863902250323, 'Tables · Query'): the selected line carries an accent bar on the left.
 * R19 (pin 453737731231960606, 'Coder IDE Component'): the window floats on a soft glow.
 * P6 (pin 36169603254422786, 'AI Assistant - SaaS & UX UI Dashboard Design'): a near-black panel
 *   lit by one soft beam from the top, a glassy prompt box with a hairline edge, suggestion chips.
 *   All monochrome here; red only for findings.
 * Seventh pass: the answer used to be stepped in by a setInterval, which stalled after the first
 * block (only 'Checklist' showed). Every block now renders at once and a CSS stagger (lp-ans)
 * reveals it, so an answer can never be left half empty.
 * Every answer comes from the app's own data for the piece that owns the clicked line.
 */

/** lines of the contract shown in the code pane */
export const WINDOW = 19;

const panes = () => import("./AskPanes");
const panesReady = () => Promise.all([panes(), loadAtlas()]);
const Live = dynamic(() => panes().then((m) => m.Panes));
/** the panes once their chunk and the atlas are in */
function Panes() {
  const atlas = useAtlas();
  return atlas && <Live atlas={atlas} />;
}

/**
 * The window renders at once (server HTML included); the panes are their own chunk and draw from
 * the sample atlas (atlas.ts), both fetched as the window nears, an empty editor of the same size
 * standing in until then.
 */
export function AskDemo({ file }: { file: string }) {
  return (
    <div className="relative pt-6 pb-16">
      {/* R19: soft glow and a perspective floor grid under the window */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[10%] top-0 h-[70%] rounded-full bg-white/[.06] blur-[90px]"
      />
      {/* R16: one editor window */}
      <div className="lp-askwin relative overflow-hidden rounded-[20px]">
        <div className="flex items-center gap-2 px-4 py-3">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-white/[.14]" />
            <span className="size-2.5 rounded-full bg-white/[.1]" />
            <span className="size-2.5 rounded-full bg-white/[.07]" />
          </span>
          <span className="ml-4 flex items-center gap-2 rounded-lg border border-white/[.06] bg-white/[.04] px-2.5 py-1 font-mono text-[11.5px] text-text">
            {file}
          </span>
          <span className="ml-auto flex items-center gap-2 text-[12.5px] text-muted">
            <span className="size-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,.8)]" />
            Ask Luora
          </span>
        </div>

        <Lazy
          wait={panesReady}
          fallback={
            <div className="grid grid-cols-[minmax(0,1fr)] gap-2 px-2 pb-2 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
              <ol className="rounded-inner border border-white/[.05] bg-[#0b0b0d] py-3 font-mono text-[12.5px] leading-[2.05]">
                {Array.from({ length: WINDOW }, (_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: empty placeholder lines
                  <li key={i}>&nbsp;</li>
                ))}
              </ol>
              <div className="h-[520px] rounded-inner border border-white/[.05] bg-[#0b0b0d]" />
            </div>
          }
        >
          <Panes />
        </Lazy>
      </div>
    </div>
  );
}
