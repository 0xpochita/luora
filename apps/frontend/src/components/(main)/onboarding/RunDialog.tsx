"use client";

import Link from "next/link";
import {
  type DragEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button, IconButton } from "@/components/ui";
import { parseRun, useRun } from "@/features/run";

const REPO_WEB = "https://github.com/0xpochita/luora/blob/main";
const STEPS = ["Welcome", "Export your run", "Load it", "Where to look"];

/**
 * The first session: four short steps, from "what am I looking at" to "where do I click". Opens
 * once per browser on the first visit (whatever data the app shows), again from the header's
 * Get started button, and on its Export step from the Sample data badge.
 */
export function RunDialog() {
  const { pane, setPane } = useRun();
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const d = ref.current;
    if (pane) setStep(pane === "project" ? 1 : pane === "look" ? 3 : 0);
    if (pane && !d?.open) d?.showModal();
    if (!pane && d?.open) d.close();
  }, [pane]);

  const last = step === STEPS.length - 1;
  return (
    <dialog
      ref={ref}
      aria-labelledby="run-title"
      onClose={() => setPane(null)}
      className="m-auto max-h-[calc(100dvh-32px)] w-[min(640px,calc(100vw-32px))] overflow-auto rounded-card border border-border bg-card-grad p-0 font-sans text-[13px] text-fg shadow-float backdrop:bg-black/60"
    >
      <div className="p-2.5">
        <header className="flex items-center gap-2 px-2 pt-1.5 pb-3">
          <span className="size-1.5 rounded-full bg-fg" />
          <h2 id="run-title" className="font-medium text-[15px]">
            {STEPS[step]}
          </h2>
          <span className="font-mono text-[12px] text-dim">
            {step + 1} / {STEPS.length}
          </span>
          <IconButton
            label="Close"
            size="sm"
            className="ml-auto"
            onClick={() => setPane(null)}
          >
            ×
          </IconButton>
        </header>
        {/* where you are in the session */}
        <ol aria-hidden="true" className="mb-3 grid grid-cols-4 gap-1.5 px-2">
          {STEPS.map((t, i) => (
            <li
              key={t}
              className={`h-1 rounded-full transition-colors ${i <= step ? "bg-fg" : "bg-raised"}`}
            />
          ))}
        </ol>

        {step === 0 && <Welcome />}
        {step === 1 && <Export />}
        {step === 2 && <Load onLoaded={() => setStep(3)} />}
        {step === 3 && <Look />}

        <footer className="mt-3 flex items-center gap-2 px-1 pb-0.5">
          {step === 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setPane(null)}>
              Skip, explore on my own
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            className="ml-auto"
            onClick={() => (last ? setPane(null) : setStep(step + 1))}
          >
            {last ? "Start auditing" : step === 0 ? "Show me how" : "Next"}
          </Button>
        </footer>
      </div>
    </dialog>
  );
}

function Lead({ children }: { children: ReactNode }) {
  return <p className="px-2 pb-3 text-body leading-normal">{children}</p>;
}

/** 1: what Luora is, in one breath, and what the app is showing right now */
function Welcome() {
  const { origin, run } = useRun();
  const now =
    origin === "file" && run ? (
      <>
        <span className="text-fg">The file you loaded</span>, {run.name}.
      </>
    ) : origin === "local" ? (
      <>
        <span className="text-fg">Your own run</span>: the luora-data.json your
        exporter wrote. Reload the page after each new export.
      </>
    ) : (
      <>
        <span className="text-fg">Sample data</span>: LuoraVault, a small demo
        vault bundled with the app. Its tests and findings are not from your
        contract.
      </>
    );
  return (
    <>
      <Lead>
        Luora turns your Foundry tests into pictures: every call a test made,
        the source line it ran, your contract as a graph, and Slither / Aderyn
        findings in one place. It only reads files on your machine.
      </Lead>
      <div className="mx-2 mb-3 rounded-inner border border-border bg-inner-grad p-3">
        <p className="mb-1 text-[12px] text-dim">What you are looking at now</p>
        <p className="text-body leading-normal">{now}</p>
      </div>
      <ol className="grid gap-2 px-2 sm:grid-cols-3">
        {[
          ["Export", "Run one script in your Foundry project."],
          ["Load", "Drop the file it writes into Luora."],
          ["Look", "Trace, contract graph, scenarios, findings."],
        ].map(([t, d], i) => (
          <li
            key={t}
            className="flex gap-2.5 rounded-inner border border-border bg-inner-grad p-3"
          >
            <span className="grid size-6 flex-none place-items-center rounded-chip bg-raised font-mono text-[12px] text-muted">
              {i + 1}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[14px] text-text">{t}</span>
              <span className="text-[12.5px] text-dim leading-normal">{d}</span>
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

/** 2: get the exporter into the project and run it */
function Export() {
  const origin = useAppOrigin();
  return (
    <>
      <Lead>
        A small Node script in your Foundry project runs{" "}
        <code className="font-mono text-fg">forge test</code> and writes{" "}
        <code className="font-mono text-fg">luora-data.json</code>. It needs{" "}
        <code className="font-mono text-fg">forge</code> on PATH and Node 20+,
        nothing to install.
      </Lead>
      <ol className="flex flex-col gap-2">
        <Step
          n={1}
          title="Open your Foundry project"
          note="The folder with foundry.toml in it."
        >
          <CopyLine text="cd path/to/your-project" />
        </Step>
        <Step
          n={2}
          title="Get the exporter from this app"
          note="Five plain Node scripts, downloaded from the app you are using, so they match it. No clone, no install."
        >
          <CopyLine text={exporterCommand(origin)} />
        </Step>
        <Step
          n={3}
          title="Run it"
          note={
            <>
              <code className="font-mono">--mt test_name</code> exports one
              test. Slither / Aderyn JSON in{" "}
              <code className="font-mono">reports/</code> is merged, or pass{" "}
              <code className="whitespace-nowrap font-mono">--slither=…</code>{" "}
              <code className="whitespace-nowrap font-mono">--aderyn=…</code>.{" "}
              <code className="font-mono">LUORA_ATLAS=Contract</code> picks the
              contract for Atlas.
            </>
          }
        >
          <CopyLine text="node luora-export.mjs" />
        </Step>
      </ol>
    </>
  );
}

/** 3: drop the file in, or keep the app pointed at it */
function Load({ onLoaded }: { onLoaded: () => void }) {
  const { origin } = useRun();
  return (
    <>
      <Lead>
        {origin === "local"
          ? "This app already reads your exporter's file. To look at another run, drop its luora-data.json here."
          : "Drop the luora-data.json the exporter wrote. It is read in this tab only and never uploaded."}
      </Lead>
      <div className="flex flex-col gap-2 px-2">
        <DropZone onLoaded={onLoaded} />
        <p className="text-[12.5px] text-dim leading-normal">
          Or keep it live: start the app with{" "}
          <code className="font-mono">
            LUORA_DATA_PATH=/path/to/luora-data.json
          </code>{" "}
          and reload after each export.
        </p>
      </div>
    </>
  );
}

/** 4: where each part of an audit lives in the app */
function Look() {
  const { setPane } = useRun();
  const card =
    "flex flex-col gap-1 rounded-inner border border-border bg-inner-grad p-3 transition-colors hover:border-border-strong";
  const places: [string, string, string][] = [
    [
      "/trace",
      "Trace",
      "Pick a test on the left and click any frame: the source panel jumps to the line it ran.",
    ],
    [
      "/atlas",
      "Atlas · Lab",
      "Your contract as a graph. Switch to Scenario, wire Actor › Call › Expect, press Run, then Export .t.sol.",
    ],
    [
      "/atlas",
      "Atlas · Findings",
      "In the tray at the bottom: Slither and Aderyn merged, mark each Confirmed or False positive, export a report.",
    ],
  ];
  return (
    <>
      <Lead>Three places cover an audit. Each opens from the top bar.</Lead>
      <div className="grid gap-2 px-2 sm:grid-cols-3">
        {places.map(([href, t, d]) => (
          <Link
            key={t}
            href={href}
            className={card}
            onClick={() => setPane(null)}
          >
            <span className="flex items-center gap-2 text-[14px] text-text">
              {t}
              <span aria-hidden="true" className="ml-auto text-dim">
                ›
              </span>
            </span>
            <span className="text-[12.5px] text-dim leading-normal">{d}</span>
          </Link>
        ))}
      </div>
      <p className="px-2 pt-3 text-[12.5px] text-dim leading-normal">
        Optional: connect your own AI from the{" "}
        <span className="text-muted">AI</span> chip in the top bar (
        <a
          className="text-muted underline-offset-2 hover:underline"
          href={`${REPO_WEB}/docs/ai-provider.md`}
        >
          how
        </a>
        ), or let your AI client propose scenarios over MCP (
        <a
          className="text-muted underline-offset-2 hover:underline"
          href={`${REPO_WEB}/docs/mcp.md`}
        >
          how
        </a>
        ).
      </p>
    </>
  );
}

/** The five exporter scripts, fetched from this running app into the current folder. */
export const exporterCommand = (origin: string) =>
  `curl -fsSLO -w "saved %{filename_effective}\\n" "${origin}/exporter/luora-{export,lib,atlas,findings,coverage}.mjs"`;

/** This app's origin once mounted (the server render assumes the default dev port). */
export function useAppOrigin() {
  const [origin, setOrigin] = useState("http://localhost:3000");
  useEffect(() => setOrigin(location.origin), []);
  return origin;
}

export function Step({
  n,
  title,
  note,
  children,
}: {
  n: number;
  title: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3 rounded-inner border border-border bg-inner-grad p-3">
      <span className="grid size-6 flex-none place-items-center rounded-chip bg-raised font-mono text-[12px] text-muted">
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="pt-0.5 text-[14px] text-text">{title}</p>
        {children}
        {note && (
          <p className="text-[12.5px] text-dim leading-normal">{note}</p>
        )}
      </div>
    </li>
  );
}

export function CopyLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="flex items-center gap-1.5 rounded-tile bg-inset py-1 pr-1 pl-3">
      {/* long commands wrap instead of scrolling, so the whole line stays readable and selectable */}
      <code className="min-w-0 flex-1 whitespace-pre-wrap py-1 font-mono text-[12px] text-fg leading-relaxed [overflow-wrap:anywhere]">
        {text}
      </code>
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

/** Reads the file in this tab only (File.text + JSON.parse); nothing is uploaded. */
export function DropZone({ onLoaded }: { onLoaded: () => void }) {
  const { setRun } = useRun();
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (file: File | undefined) => {
    if (!file) return;
    const r = parseRun(await file.text());
    if (!r.ok) return setError(`${file.name}: ${r.error}`);
    setError(null);
    setRun({ data: r.data, name: file.name, stamp: Date.now() });
    onLoaded();
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    load(e.dataTransfer.files[0]);
  };

  return (
    <>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-tile border border-dashed px-4 py-5 text-center transition-colors focus-within:border-border-strong ${over ? "border-fg/40 bg-hover" : "border-border-strong bg-inset hover:bg-hover"}`}
      >
        <span className="text-[14px] text-fg">
          Drop luora-data.json here, or choose the file
        </span>
        <span className="text-[12.5px] text-dim">
          Read in this tab only, never uploaded.
        </span>
        <input
          type="file"
          accept=".json,application/json"
          className="sr-only"
          onChange={(e) => {
            load(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 text-[12.5px] text-body"
        >
          <span className="mt-1.5 size-1.5 flex-none rounded-full bg-red" />
          <span className="min-w-0 break-words font-mono">{error}</span>
        </p>
      )}
    </>
  );
}
