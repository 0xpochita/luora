"use client";

import { useEffect, useRef, useState } from "react";
import {
  Button,
  Dropdown,
  Input,
  PH,
  PhIcon,
  SegmentedControl,
} from "@/components/ui";
import {
  type AiConfig,
  type AiKind,
  aiReady,
  claudeModels,
  configFor,
  modelLabel,
  NO_AI,
  PROVIDERS,
  saveAiConfig,
  testConnection,
  useAiConfig,
} from "@/features/ai";
import "./ai-settings.css";

type Mode = "none" | "claude" | "local" | "key";
const modeOf = (k: AiKind): Mode =>
  k === "none" || k === "claude" || k === "local" ? k : "key";
const KEYED: AiKind[] = ["anthropic", "openai", "openrouter"];

const NOTE: Record<Mode, string> = {
  none: "Ask answers come from Luora's built-in text. Nothing leaves your machine.",
  claude:
    "Ask runs your own Claude Code on this laptop, signed in with your own Claude plan, like Orca runs the agents you already pay for. Luora never sees or stores your login. Answers use your plan's limits. Works while Luora runs locally (pnpm dev).",
  local:
    "Ask sends the selected piece (its source lines, connected pieces and findings) and your question to the endpoint above, from your browser. Nothing goes to a Luora server.",
  key: "Ask sends the selected piece (its source lines, connected pieces and findings) and your question straight from your browser to the provider you picked. Your key is stored only in this browser's localStorage, is sent only to that provider and is never logged or sent to Luora.",
};

type Test = { state: "idle" | "busy" | "ok" | "bad"; text?: string };
/** what app/api/claude says about the Claude Code on this machine */
type ClaudeStatus = {
  available: boolean;
  loggedIn: boolean;
  version?: string;
  authMethod?: string | null;
  plan?: string | null;
  error?: string;
} | null;

const OPEN = "luora-ai-settings";
/** Opens the AI provider dialog from anywhere (the trace's Ask AI panel). */
export const openAiSettings = () => dispatchEvent(new Event(OPEN));

/** "AI provider" settings: none (canned answers), a local model, or the user's own API key. */
export function AiSettings() {
  const saved = useAiConfig();
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<AiConfig>(NO_AI);
  const [test, setTest] = useState<Test>({ state: "idle" });
  const [claude, setClaude] = useState<ClaudeStatus>(null);
  const mode = modeOf(draft.kind);
  // ask the local bridge whether Claude Code is here and signed in, each time "Your Claude" is shown
  useEffect(() => {
    if (mode !== "claude") return;
    let live = true;
    setClaude(null);
    fetch(PROVIDERS.claude.baseUrl)
      .then((r) => r.json())
      .then((s: ClaudeStatus) => live && setClaude(s))
      .catch(
        () =>
          live &&
          setClaude({
            available: false,
            loggedIn: false,
            error:
              "The bridge didn't answer. Run Luora locally (pnpm dev) and open it at localhost.",
          }),
      );
    return () => {
      live = false;
    };
  }, [mode]);
  const edit = (patch: Partial<AiConfig>) => {
    setDraft({ ...draft, ...patch });
    setTest({ state: "idle" });
  };
  const pick = (kind: AiKind) => {
    setDraft(kind === saved.kind ? saved : configFor(kind));
    setTest({ state: "idle" });
  };

  const open = () => {
    setDraft(saved);
    setTest({ state: "idle" });
    dialog.current?.showModal();
  };
  const save = () => {
    saveAiConfig(draft.kind === "none" ? NO_AI : draft);
    dialog.current?.close();
  };
  const forget = () => {
    edit({ key: "" });
    saveAiConfig(saved.kind === "local" ? { ...saved, key: "" } : NO_AI);
  };
  const run = async () => {
    setTest({ state: "busy" });
    try {
      const reply = await testConnection(draft);
      setTest({
        state: "ok",
        text: `Connected · ${modelLabel(draft) || PROVIDERS[draft.kind].label} replied “${reply.slice(0, 40) || "(empty)"}”`,
      });
    } catch (e) {
      setTest({ state: "bad", text: (e as Error).message });
    }
  };
  useEffect(() => {
    addEventListener(OPEN, open);
    return () => removeEventListener(OPEN, open);
  });
  const ready = aiReady(draft);
  const connected = saved.kind !== "none";

  return (
    <>
      {/* the header's capsule family (header.css): lit ring until an AI is connected, then a
          plain capsule with a glowing green dot, provider and model; B3 pin/14073817581281652
          model-selector content (icon + name + caret) */}
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        title={
          connected ? "Change your AI provider" : "Connect your own AI to Ask"
        }
        className={`group hdr-pill ${connected ? "" : "lit"}`}
      >
        {connected ? (
          <>
            <span className="hdr-dot text-green" aria-hidden="true" />
            {PROVIDERS[saved.kind].label}
            {modelLabel(saved) && (
              <span className="max-w-[140px] truncate font-mono text-[11.5px] text-dim">
                {modelLabel(saved)}
              </span>
            )}
          </>
        ) : (
          <>
            <PhIcon
              d={PH.sparkle}
              className="size-[15px] transition-transform duration-500 group-hover:rotate-[20deg] group-hover:scale-110 motion-reduce:transition-none"
            />
            Connect AI
          </>
        )}
        <PhIcon d={PH.caretDown} className="size-3 text-dim" />
      </button>
      <dialog
        ref={dialog}
        aria-label="AI provider"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        onKeyDown={(e) => e.key === "Escape" && e.stopPropagation()}
        className="ai-dialog m-auto w-[min(480px,calc(100vw-32px))] rounded-card border border-border bg-card-grad p-0 text-fg shadow-float"
      >
        <form
          method="dialog"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="flex flex-col gap-3 p-4"
        >
          <header className="flex items-center gap-2 text-[14px]">
            <span className="size-1.5 rounded-full bg-fg" />
            <span className="font-medium">AI provider</span>
            <span className="ml-auto text-[12.5px] text-dim">
              Luora hosts no AI
            </span>
          </header>
          <SegmentedControl<Mode>
            value={mode}
            onChange={(m) => pick(m === "key" ? "anthropic" : m)}
            options={[
              { value: "none", label: "None" },
              {
                value: "claude",
                label: "Your Claude",
                title: "Your own Claude Code and Claude plan, on this laptop",
              },
              { value: "local", label: "Local model" },
              { value: "key", label: "Own API key" },
            ]}
          />
          {mode !== "none" && (
            <div className="flex flex-col gap-2.5 rounded-inner border border-border bg-inner-grad p-3">
              {mode === "key" && (
                <Row label="Provider">
                  <Dropdown
                    ariaLabel="Provider"
                    value={draft.kind}
                    onChange={(k) => pick(k as AiKind)}
                    className="w-full"
                    options={KEYED.map((k) => ({
                      value: k,
                      label: PROVIDERS[k].label,
                    }))}
                  />
                </Row>
              )}
              {mode === "local" && (
                <Row label="Endpoint">
                  <Input
                    aria-label="Endpoint"
                    value={draft.baseUrl}
                    onChange={(e) => edit({ baseUrl: e.target.value })}
                    placeholder={PROVIDERS.local.baseUrl}
                    spellCheck={false}
                    className="w-full font-mono text-[12px]"
                  />
                </Row>
              )}
              {mode === "claude" && <ClaudeLine s={claude} />}
              <Row label="Model">
                {mode === "claude" ? (
                  <Dropdown
                    ariaLabel="Model"
                    value={draft.model || "default"}
                    onChange={(m) => edit({ model: m === "default" ? "" : m })}
                    className="w-full"
                    options={claudeModels(draft.model).map((m) => ({
                      value: m.value || "default",
                      label: `${m.label} · ${m.hint}`,
                      text: m.label,
                    }))}
                  />
                ) : (
                  <Input
                    aria-label="Model"
                    value={draft.model}
                    onChange={(e) => edit({ model: e.target.value })}
                    placeholder={PROVIDERS[draft.kind].model}
                    spellCheck={false}
                    className="w-full font-mono text-[12px]"
                  />
                )}
              </Row>
              {mode !== "claude" && (
                <Row label={mode === "local" ? "Key (optional)" : "API key"}>
                  <Input
                    type="password"
                    aria-label="API key"
                    value={draft.key}
                    onChange={(e) => edit({ key: e.target.value })}
                    placeholder={PROVIDERS[draft.kind].keyHint ?? "not needed"}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full font-mono text-[12px]"
                  />
                </Row>
              )}
              <div className="flex items-center gap-1.5 pt-0.5">
                <Button
                  size="sm"
                  disabled={
                    !ready ||
                    test.state === "busy" ||
                    (mode === "claude" && !claude?.loggedIn)
                  }
                  onClick={run}
                >
                  {test.state === "busy" ? "Testing…" : "Test connection"}
                </Button>
                {(draft.key || saved.key) && (
                  <Button size="sm" variant="ghost" onClick={forget}>
                    Forget key
                  </Button>
                )}
              </div>
              {test.text && (
                <output className="flex items-start gap-2 break-words text-[12.5px] text-body">
                  <span
                    className={`mt-1.5 size-1.5 flex-none rounded-full ${test.state === "ok" ? "bg-green" : "bg-red"}`}
                  />
                  {test.text}
                </output>
              )}
            </div>
          )}
          <p className="text-[12.5px] text-muted leading-normal">
            {NOTE[mode]}
          </p>
          <div className="flex justify-end gap-1.5">
            <Button variant="ghost" onClick={() => dialog.current?.close()}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={draft.kind !== "none" && !ready}
            >
              Save
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Claude Code on this machine: found and signed in (with which plan), or what to do. */
function ClaudeLine({ s }: { s: ClaudeStatus }) {
  const ok = !!s?.available && s.loggedIn;
  const text = !s
    ? "Looking for Claude Code on this laptop…"
    : ok
      ? `Claude Code ${s.version?.split(" ")[0] ?? ""} · signed in${s.authMethod === "claude.ai" ? ` with your Claude${s.plan ? ` ${s.plan}` : ""} plan` : ""}`
      : s.available
        ? (s.error ??
          "Claude Code is here but not signed in. Run `claude` once in a terminal and sign in.")
        : (s.error ?? "Claude Code is not installed.");
  return (
    <p className="flex items-start gap-2 text-[12.5px] text-body leading-normal">
      <span
        className={`mt-1.5 size-1.5 flex-none rounded-full ${!s ? "bg-dim" : ok ? "bg-green" : "bg-red"}`}
      />
      <span>
        {text}
        {s && !s.available && (
          <>
            {" "}
            Install it from{" "}
            <a
              href="https://docs.claude.com/en/docs/claude-code/setup"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-white/30 underline-offset-2 hover:decoration-white"
            >
              the Claude Code docs
            </a>
            , run <code className="font-mono">claude</code> once to sign in,
            then reopen this.
          </>
        )}
      </span>
    </p>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[108px_1fr] items-center gap-2 text-[13px] text-muted">
      <span>{label}</span>
      {children}
    </div>
  );
}
