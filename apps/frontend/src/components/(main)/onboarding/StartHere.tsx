"use client";

import { useState } from "react";
import { Button, PH, PhIcon, Tabs } from "@/components/ui";
import { useRun } from "@/features/run";
import {
  CopyLine,
  DropZone,
  exporterCommand,
  Step,
  useAppOrigin,
} from "./RunDialog";

/**
 * The setup as one prompt for the auditor's own coding agent (Claude Code, Cursor, Codex, …):
 * the same steps as the manual path, run by the agent in the Foundry project, read-and-run only.
 */
const agentPrompt = (
  origin: string,
) => `Set up Luora for this Foundry project. Luora is a local, read-only viewer for Foundry test runs (traces, a contract graph, findings).

1. Check that \`forge --version\` and \`node --version\` (Node 20 or newer) work. If Foundry is missing, ask me first, then install it with \`curl -L https://foundry.paradigm.xyz | bash\` and \`foundryup\`.
2. In the project root (the folder with foundry.toml), download the Luora exporter from my running Luora app:
   curl -fsSLO -w "saved %{filename_effective}\\n" "${origin}/exporter/luora-{export,lib,atlas,findings,coverage}.mjs"
3. Run \`node luora-export.mjs\` there. It runs \`forge test\` with traces and writes luora-data.json. If Slither or Aderyn JSON reports exist in reports/, it merges them. If the build or a test fails, show me the error.
4. Tell me the absolute path of luora-data.json and the summary lines the exporter printed.

Optional, only if I say yes: download ${origin}/exporter/luora-mcp.mjs and register it as an MCP server pointed at that luora-data.json (for Claude Code: \`claude mcp add luora -- node <abs path>/luora-mcp.mjs --data=<abs path>/luora-data.json\`), so you can read the run and propose test scenarios in the Luora Lab.

Only read files and run these commands. Do not edit my contracts, tests or foundry.toml.`;

/**
 * What Trace and Atlas show while nothing is loaded: the way in from zero, as four steps (tools,
 * exporter, export, load) ending in the drop zone, plus the sample for anyone without a Foundry
 * project at hand. Loading a run hands over to the first session's "Where to look" step.
 */
export function StartHere() {
  const { setPane, setSample } = useRun();
  const origin = useAppOrigin();
  const [how, setHow] = useState<"manual" | "agent">("manual");
  return (
    <div className="flex min-h-0 flex-1 overflow-auto px-3 pb-3">
      <div className="m-auto w-[min(720px,100%)] py-8">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-raised px-3 py-1 text-[12px] text-muted">
          <PhIcon d={PH.rocket} className="size-[13px] text-fg" />
          Start here
        </p>
        <h1 className="font-medium text-[clamp(24px,3vw,32px)] text-fg leading-tight tracking-[-0.02em]">
          Load your first run
        </h1>
        <p className="mt-2 max-w-[560px] text-[14px] text-body leading-relaxed">
          Luora shows what your Foundry tests actually did: every call, the
          source line it ran, your contract as a graph and its findings. Nothing
          is loaded yet. A few minutes from zero, by hand or with your AI agent.
        </p>

        <Tabs
          className="mt-6"
          size="sm"
          value={how}
          onChange={setHow}
          options={[
            {
              value: "manual",
              label: "For Human",
              icon: <PhIcon d={PH.user} />,
            },
            {
              value: "agent",
              label: "For Agent",
              icon: <PhIcon d={PH.robot} />,
            },
          ]}
        />

        <ol className="mt-3 flex flex-col gap-2">
          {how === "agent" ? (
            <Step
              n={1}
              title="Paste this into your coding agent"
              note="Claude Code, Cursor, Codex or any agent that can run commands in your Foundry project. It only reads and runs: it downloads the exporter from this app, runs it, and tells you where luora-data.json is."
            >
              <CopyBlock text={agentPrompt(origin)} />
            </Step>
          ) : (
            <>
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
                    <code className="font-mono">reports/</code> if you have
                    them, and writes{" "}
                    <code className="font-mono">luora-data.json</code>.{" "}
                    <code className="font-mono">--mt test_name</code> exports
                    one test.
                  </>
                }
              >
                <CopyLine text="node luora-export.mjs" />
              </Step>
            </>
          )}
          <Step
            n={how === "agent" ? 2 : 4}
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

/** A multi-line prompt with its own copy button (the agent path). */
function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="rounded-tile bg-inset">
      <div className="flex items-center gap-2 border-border border-b py-1.5 pr-1.5 pl-3">
        <span className="font-mono text-[11.5px] text-dim">setup prompt</span>
        <Button
          size="sm"
          variant="primary"
          className="ml-auto h-7 px-2.5"
          onClick={copy}
        >
          {copied ? "Copied" : "Copy prompt"}
        </Button>
      </div>
      <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap p-3 font-mono text-[12px] text-fg leading-relaxed [overflow-wrap:anywhere]">
        {text}
      </pre>
    </div>
  );
}
