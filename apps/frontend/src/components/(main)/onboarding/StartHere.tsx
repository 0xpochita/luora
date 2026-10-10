"use client";

import { Button } from "@/components/ui";
import { useRun } from "@/features/run";
import {
  CopyLine,
  DropZone,
  exporterCommand,
  Step,
  useAppOrigin,
} from "./RunDialog";

/**
 * What Trace and Atlas show while nothing is loaded: the way in from zero, as four steps (tools,
 * exporter, export, load) ending in the drop zone, plus the sample for anyone without a Foundry
 * project at hand. Loading a run hands over to the first session's "Where to look" step.
 */
export function StartHere() {
  const { setPane, setSample } = useRun();
  const origin = useAppOrigin();
  return (
    <div className="flex min-h-0 flex-1 overflow-auto px-3 pb-3">
      <div className="m-auto w-[min(720px,100%)] py-8">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-raised px-3 py-1 text-[12px] text-muted">
          <span className="size-1.5 rounded-full bg-fg" />
          Start here
        </p>
        <h1 className="font-medium text-[clamp(24px,3vw,32px)] text-fg leading-tight tracking-[-0.02em]">
          Load your first run
        </h1>
        <p className="mt-2 max-w-[560px] text-[14px] text-body leading-relaxed">
          Luora shows what your Foundry tests actually did: every call, the
          source line it ran, your contract as a graph and its findings. Nothing
          is loaded yet. Four steps from zero, about five minutes.
        </p>

        <ol className="mt-6 flex flex-col gap-2">
          <Step
            n={1}
            title="Install the tools"
            note="Already have forge and Node 20+? Skip this step."
          >
            <CopyLine text="curl -L https://foundry.paradigm.xyz | bash && foundryup" />
          </Step>
          <Step
            n={2}
            title="Get the exporter into your Foundry project"
            note="Run it in the folder with foundry.toml. It downloads five plain Node scripts from this app, so they match the version you are using. No clone, no install."
          >
            <CopyLine text="cd path/to/your-project" />
            <CopyLine text={exporterCommand(origin)} />
          </Step>
          <Step
            n={3}
            title="Export a run"
            note={
              <>
                It runs <code className="font-mono">forge test</code> with
                traces, maps the contract, merges Slither / Aderyn JSON from{" "}
                <code className="font-mono">reports/</code> if you have them,
                and writes <code className="font-mono">luora-data.json</code>.{" "}
                <code className="font-mono">--mt test_name</code> exports one
                test.
              </>
            }
          >
            <CopyLine text="node luora-export.mjs" />
          </Step>
          <Step
            n={4}
            title="Load it"
            note={
              <>
                Or keep it live: restart the app with{" "}
                <code className="font-mono">
                  LUORA_DATA_PATH=/abs/path/to/luora-data.json pnpm dev
                </code>{" "}
                and reload after each export.
              </>
            }
          >
            <DropZone onLoaded={() => setPane("look")} />
          </Step>
        </ol>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-inner border border-border bg-inner-grad p-4">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] text-text">No Foundry project at hand?</p>
            <p className="text-[12.5px] text-dim leading-normal">
              Look around with LuoraVault, a small demo vault bundled with the
              app. A Sample data badge stays in the top bar.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setSample(true)}>
            Try the sample vault
          </Button>
        </div>
        <p className="mt-4 text-[12.5px] text-dim">
          Everything stays on your machine: the exporter and the app read local
          files, a dropped file is read in this tab only.
        </p>
      </div>
    </div>
  );
}
