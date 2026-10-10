"use client";

import {
  type DragEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button, IconButton } from "@/components/ui";
import { parseRun, useRun } from "@/features/run";

const REPO = "https://github.com/0xpochita/luora.git";

/** Welcome on first sample visit, and the "Use my project" steps (also opened by the header badge). */
export function RunDialog() {
  const { pane, setPane } = useRun();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (pane && !d?.open) d?.showModal();
    if (!pane && d?.open) d.close();
  }, [pane]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="run-title"
      onClose={() => setPane(null)}
      className="m-auto max-h-[calc(100dvh-32px)] w-[min(600px,calc(100vw-32px))] overflow-auto rounded-card border border-border bg-card-grad p-0 font-sans text-[13px] text-fg shadow-float backdrop:bg-black/60"
    >
      <div className="p-2.5">
        {pane === "welcome" ? <Welcome /> : pane === "project" && <Project />}
      </div>
    </dialog>
  );
}

function Title({ children }: { children: ReactNode }) {
  const { setPane } = useRun();
  return (
    <header className="flex items-center gap-2 px-2 pt-1.5 pb-3">
      <span className="size-1.5 rounded-full bg-fg" />
      <h2 id="run-title" className="font-medium text-[15px]">
        {children}
      </h2>
      <IconButton
        label="Close"
        size="sm"
        className="ml-auto"
        onClick={() => setPane(null)}
      >
        ×
      </IconButton>
    </header>
  );
}

function Welcome() {
  const { setPane } = useRun();
  const choice =
    "flex flex-1 flex-col gap-1.5 rounded-inner border border-border bg-inner-grad p-4 text-left transition-colors hover:border-border-strong";
  return (
    <>
      <Title>Welcome to Luora</Title>
      <p className="px-2 pb-4 text-body leading-normal">
        You are looking at <span className="text-fg">sample data</span>:
        LuoraVault, a small demo vault bundled with the app. Its tests, traces
        and findings are not from your contract.
      </p>
      <div className="flex gap-2 max-sm:flex-col">
        <button type="button" className={choice} onClick={() => setPane(null)}>
          <span className="font-medium text-[14px]">
            Explore the sample vault
          </span>
          <span className="text-body">
            Look around Trace and Atlas first. The Sample data badge stays in
            the top bar.
          </span>
        </button>
        <button
          type="button"
          className={choice}
          onClick={() => setPane("project")}
        >
          <span className="flex items-center gap-2 font-medium text-[14px]">
            Use my project
            <span className="ml-auto grid size-6 place-items-center rounded-chip bg-primary text-primary-fg">
              →
            </span>
          </span>
          <span className="text-body">
            Export a run from your Foundry project and load it. About a minute.
          </span>
        </button>
      </div>
    </>
  );
}

function Project() {
  return (
    <>
      <Title>Use my project</Title>
      <p className="px-2 pb-3 text-body leading-normal">
        A small Node script in your Foundry project runs{" "}
        <code className="font-mono text-fg">forge test</code> and writes{" "}
        <code className="font-mono text-fg">luora-data.json</code>. It needs{" "}
        <code className="font-mono text-fg">forge</code> on PATH and Node 20+,
        nothing to install.
      </p>
      <ol className="flex flex-col gap-2">
        <Step n={1} title="Get the exporter">
          <CopyLine text={`git clone ${REPO}`} />
        </Step>
        <Step
          n={2}
          title="Copy its five scripts into your Foundry project root"
          note="luora-export.mjs imports the other four, so keep them side by side."
        >
          <CopyLine text="cp luora/foundry/luora-{export,lib,atlas,findings,coverage}.mjs path/to/your-project/" />
        </Step>
        <Step
          n={3}
          title="Run it in that project"
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
        <Step
          n={4}
          title="Load luora-data.json"
          note={
            <>
              Or keep it live: start the app with{" "}
              <code className="font-mono">LUORA_DATA_PATH</code> set to the file
              and reload after each export.
            </>
          }
        >
          <DropZone />
        </Step>
      </ol>
    </>
  );
}

function Step({
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

function CopyLine({ text }: { text: string }) {
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
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[12px] text-fg">
        {text}
      </code>
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

/** Reads the file in this tab only (File.text + JSON.parse); nothing is uploaded. */
function DropZone() {
  const { setRun, setPane } = useRun();
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (file: File | undefined) => {
    if (!file) return;
    const r = parseRun(await file.text());
    if (!r.ok) return setError(`${file.name}: ${r.error}`);
    setError(null);
    setRun({ data: r.data, name: file.name, stamp: Date.now() });
    setPane(null);
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
