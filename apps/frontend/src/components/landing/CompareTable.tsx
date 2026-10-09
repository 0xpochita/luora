"use client";

import { LogoMark } from "@/components/ui/LogoMark";
import { CompareStage } from "./motion";

/*
 * Compare's rows (Closing.tsx): static. A client component so the page ships these few lines of
 * code instead of every cell again in the RSC payload.
 */

/** One row: what you get, what Luora shows (a full sentence, R29), what the CLIs give today (null = nothing). */
const ROWS: { what: string; luora: string; cli: string | null }[] = [
  {
    what: "Decoded calls, events and cheatcodes",
    luora: "Every call, event and cheatcode decoded with your own ABIs.",
    cli: "A text tree from forge -vvvv",
  },
  {
    what: "Source lines each frame executed",
    luora: "Each frame opens on the source lines it ran.",
    cli: "Step through them in forge debug",
  },
  {
    what: "Storage reads and writes per line",
    luora: "Slot reads and writes pinned to the line that made them.",
    cli: "Step through them in forge debug",
  },
  {
    what: "Call graph per test",
    luora: "A call graph drawn for every test.",
    cli: null,
  },
  {
    what: "Slither and Aderyn merged per issue",
    luora: "Slither and Aderyn merged into one finding per issue.",
    cli: "Two separate reports",
  },
  {
    what: "Triage status and Markdown report",
    luora: "Triage each finding, then export a Markdown report.",
    cli: null,
  },
  {
    what: "Coverage per function, untested first",
    luora: "Coverage per function, untested ones listed first.",
    cli: "A per-file table from forge coverage",
  },
  {
    what: "Wire a scenario, export a .t.sol",
    luora: "Wire actors and calls, export the scenario as a .t.sol.",
    cli: "Written by hand",
  },
];

/** R27 / R29: a check in a small circle (Luora column). */
function CheckCircle() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="mt-[3px] size-4 flex-none text-fg"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="7" strokeOpacity="0.55" />
      <path d="M5 8.2L7.1 10.2L11 6" />
    </svg>
  );
}

/** R27 / R28: ✕ where the CLIs have nothing — muted, it is a missing feature, not a finding. */
function Cross() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="mt-[3px] size-4 flex-none text-white/30"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    >
      <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" />
    </svg>
  );
}

/** R29: competitor cells lead with an icon too; a hollow dim ring where the CLIs do have something. */
function Ring() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="mt-[3px] size-4 flex-none text-white/25"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <circle cx="8" cy="8" r="3" />
    </svg>
  );
}

function CliCell({ cli }: { cli: string | null }) {
  return cli ? (
    <>
      <Ring />
      <span>{cli}</span>
    </>
  ) : (
    <>
      <Cross />
      <span className="sr-only">Not available</span>
    </>
  );
}

/**
 * the raised Luora card and the table, see Compare. One table for both layouts: from md it is the
 * three-column grid; below md every row is a stacked card (row label, the Luora answer in its own
 * raised inner card, the CLI line), so the rows are not rendered twice.
 */
export function CompareTable() {
  return (
    <CompareStage className="relative mt-20 md:ml-[164px]">
      {/* desktop: three columns, the Luora column one raised card spanning every row (R27); the
          card is its own element (columns 0.85 / 1.45 / 1 fr) so it can slide up into place */}
      <div
        aria-hidden="true"
        data-lp="card"
        className="absolute -top-3 -bottom-4 left-[25.76%] hidden w-[43.94%] rounded-card border border-white/[.13] bg-card-grad shadow-[0_0_80px_-12px_rgba(255,255,255,.14),0_24px_48px_rgba(0,0,0,.55)] md:block"
      />
      <table className="relative block text-left md:grid md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.45fr)_minmax(0,1fr)] md:grid-rows-[auto_repeat(8,auto)]">
        <caption className="sr-only">
          Luora compared with forge and the analyzer CLIs
        </caption>
        <thead className="hidden md:contents">
          <tr className="contents">
            <th className="col-start-1 row-start-1 self-end pb-4 font-normal text-[13px] text-dim">
              What you get
            </th>
            <th className="relative col-start-2 row-start-1 flex items-center gap-2.5 px-6 pt-4 pb-5 font-medium text-[17px] text-fg">
              <LogoMark />
              Luora
            </th>
            <th className="col-start-3 row-start-1 self-end px-6 pb-4 font-normal text-[13px] text-dim">
              forge + analyzer CLIs
            </th>
          </tr>
        </thead>
        <tbody className="block space-y-3 md:contents">
          {ROWS.map((r, i) => (
            <tr
              key={r.what}
              data-card={i}
              className="block rounded-card border border-white/[.07] bg-[#0c0c0d] p-2 md:contents"
            >
              <th
                scope="row"
                data-row={i}
                className="block px-3 pt-2 pb-2.5 font-normal text-[13px] text-dim md:col-start-1 md:border-white/[.07] md:border-t md:px-0 md:py-5 md:pr-4 md:text-[14.5px] md:text-body"
                style={{ gridRowStart: i + 2 }}
              >
                {r.what}
              </th>
              <td
                data-row={i}
                className="relative block max-md:rounded-inner max-md:border max-md:border-white/[.13] max-md:bg-card-grad max-md:p-3 max-md:shadow-[0_0_40px_-12px_rgba(255,255,255,.14)] md:col-start-2 md:mx-3 md:border-white/[.06] md:border-t md:px-3 md:py-5"
                style={{ gridRowStart: i + 2 }}
              >
                <p className="mb-2 flex items-center gap-2 text-[12.5px] text-muted md:hidden">
                  <span className="size-1.5 rounded-full bg-white" />
                  Luora
                </p>
                <p className="flex gap-2.5 text-[14px] text-fg leading-snug md:gap-3 md:text-[15px]">
                  <CheckCircle />
                  {r.luora}
                </p>
              </td>
              <td
                data-row={i}
                className="flex gap-2.5 px-3 pt-3 pb-2 text-[13px] text-dim leading-snug md:col-start-3 md:gap-3 md:border-white/[.07] md:border-t md:px-6 md:py-5 md:text-[13.5px]"
                style={{ gridRowStart: i + 2 }}
              >
                <CliCell cli={r.cli} />
                {r.cli ? null : (
                  <span aria-hidden="true" className="md:hidden">
                    Not in the CLIs
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CompareStage>
  );
}
