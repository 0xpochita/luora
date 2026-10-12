"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Button, ENTER, PH, PhIcon, Tabs } from "@/components/ui";
import { LOCAL_APP } from "@/config/site";
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
2. In the project root (the folder with foundry.toml), download the Luora exporter from the Luora app:
   curl -fsSLO -w "saved %{filename_effective}\\n" "${origin}/exporter/luora-{export,lib,atlas,findings,coverage,chains}.mjs"
3. Run \`node luora-export.mjs\` there. It runs \`forge test\` with traces and writes luora-data.json. If Slither or Aderyn JSON reports exist in reports/, it merges them. If the build or a test fails, show me the error. Only if I ask for forks: \`node luora-export.mjs --forks all\` runs the same tests on copies of six EVM testnets (read-only public RPCs, no transaction is sent).
4. Tell me the absolute path of luora-data.json and the summary lines the exporter printed.
${
  LOCAL_APP
    ? `
Optional, only if I say yes: download ${origin}/exporter/luora-mcp.mjs and register it as an MCP server pointed at that luora-data.json (for Claude Code: \`claude mcp add luora -- node <abs path>/luora-mcp.mjs --data=<abs path>/luora-data.json\`), so you can read the run and propose test scenarios in the Luora Lab.
`
    : ""
}
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

        {/* H1 pin/42854633948971517 (Stockboard hero): the quickest way in sits right under the
            title as its action, not at the foot of the steps */}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button variant="primary" size="sm" onClick={() => setSample(true)}>
            <PhIcon d={PH.flask} className="size-[14px]" />
            Try the sample vault
          </Button>
          <p className="min-w-0 flex-1 text-[12.5px] text-muted leading-normal">
            <span className="text-text">No Foundry project at hand?</span> Look
            around with LuoraVault, a small demo vault bundled with the app.
          </p>
        </div>

        <Tabs
          className="mt-8"
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

        <motion.ol key={how} {...ENTER} className="mt-3 flex flex-col gap-2">
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
                note="Run it in the folder with foundry.toml. It downloads six plain Node scripts from this app, so they match the version you are using. No clone, no install."
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
                    one test; <code className="font-mono">--forks all</code>{" "}
                    also runs them on testnet forks (Sepolia, Arbitrum, Base,
                    Robinhood, HyperEVM, Tempo).
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
              LOCAL_APP ? (
                <>
                  Or keep it live: restart the app with{" "}
                  <code className="font-mono">
                    LUORA_DATA_PATH=/abs/path/to/luora-data.json pnpm dev
                  </code>{" "}
                  and reload after each export.
                </>
              ) : undefined
            }
          >
            <DropZone onLoaded={() => setPane("look")} />
          </Step>
        </motion.ol>

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
