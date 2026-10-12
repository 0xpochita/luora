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
  CLAUDE_HERE,
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
/** signing Claude Code in or out: confirm = asked to sign out, waiting = finishing on claude.ai */
type Auth = {
  step: "idle" | "confirm" | "busy" | "waiting";
  url?: string | null;
  error?: string;
};
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
  const [tick, setTick] = useState(0);
  const [auth, setAuth] = useState<Auth>({ step: "idle" });
  const mode = modeOf(draft.kind);
  // ask the local bridge whether Claude Code is here and signed in, each time "Your Claude" is
  // shown and after signing in or out
  useEffect(() => {
    if (mode !== "claude") return;
    let live = true;
    if (!tick) setClaude(null);
    fetch(PROVIDERS.claude.baseUrl, { cache: "no-store" })
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
  }, [mode, tick]);
  // while you finish signing in on claude.ai, look again every two seconds
  useEffect(() => {
    if (auth.step !== "waiting") return;
    if (claude?.loggedIn) return setAuth({ step: "idle" });
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, [auth.step, claude?.loggedIn]);
  /** Claude Code's own sign-in / sign-out, run on this laptop by app/api/claude/auth */
  const authOp = async (op: "login" | "logout") => {
    setAuth({ step: "busy" });
    try {
      const r = await fetch(`${PROVIDERS.claude.baseUrl}/auth`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op }),
      });
      const j = (await r.json()) as { error?: string; url?: string | null };
      if (!r.ok) return setAuth({ step: "idle", error: j.error });
      setTest({ state: "idle" });
      setAuth(
        op === "login" ? { step: "waiting", url: j.url } : { step: "idle" },
      );
      setTick((t) => t + 1);
    } catch (e) {
      setAuth({ step: "idle", error: (e as Error).message });
    }
  };
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
              // only a local Luora can run your Claude Code (CLAUDE_HERE)
              ...(CLAUDE_HERE
                ? [
                    {
                      value: "claude" as const,
                      label: "Your Claude",
                      title:
                        "Your own Claude Code and Claude plan, on this laptop",
                    },
                  ]
                : []),
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
              {mode === "claude" && (
                <ClaudeLine
                  s={claude}
                  auth={auth}
                  onAuth={setAuth}
                  onSignIn={() => authOp("login")}
                  onSignOut={() => authOp("logout")}
                />
              )}
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
            {/* stop using the connected AI in Luora; for Your Claude it does not sign Claude Code out */}
            {connected && (
              <Button
                variant="ghost"
                className="mr-auto"
                title={
                  saved.kind === "claude"
                    ? "Stop using your Claude in Luora (Claude Code stays signed in)"
                    : "Stop using this AI in Luora and forget its key"
                }
                onClick={() => {
                  saveAiConfig(NO_AI);
                  setDraft(NO_AI);
                  setTest({ state: "idle" });
                  dialog.current?.close();
                }}
              >
                <span className="size-1.5 rounded-full bg-red" />
                Disconnect
              </Button>
            )}
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

/**
 * Claude Code on this machine: found and signed in (with which plan), or what to do, plus its own
 * sign-in and sign-out. Signing out is Claude Code's, for the whole laptop, so it asks first.
 */
function ClaudeLine({
  s,
  auth,
  onAuth,
  onSignIn,
  onSignOut,
}: {
  s: ClaudeStatus;
  auth: Auth;
  onAuth: (a: Auth) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const ok = !!s?.available && s.loggedIn;
  const text = !s
    ? "Looking for Claude Code on this laptop…"
    : ok
      ? `Claude Code ${s.version?.split(" ")[0] ?? ""} · signed in${s.authMethod === "claude.ai" ? ` with your Claude${s.plan ? ` ${s.plan}` : ""} plan` : ""}`
      : s.available
        ? "Claude Code is here but not signed in."
        : (s.error ?? "Claude Code is not installed.");
  const busy = auth.step === "busy";
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-start gap-2 text-[12.5px] text-body leading-normal">
        <span
          className={`mt-1.5 size-1.5 flex-none rounded-full ${!s || auth.step === "waiting" ? "bg-dim" : ok ? "bg-green" : "bg-red"}`}
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
              , then reopen this.
            </>
          )}
        </span>
      </p>

      {auth.step === "confirm" ? (
        <div className="rounded-tile border border-border bg-inset p-2.5 text-[12.5px] text-body leading-normal">
          Sign Claude Code out on this laptop? This is Claude Code's own
          sign-out: every terminal and app that uses Claude Code here (Orca
          included) is signed out too, not only Luora.
          <div className="mt-2 flex gap-1.5">
            <Button size="sm" onClick={onSignOut}>
              <span className="size-1.5 rounded-full bg-red" />
              Sign out of Claude
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAuth({ step: "idle" })}
            >
              Keep signed in
            </Button>
          </div>
        </div>
      ) : auth.step === "waiting" ? (
        <p className="text-[12.5px] text-muted leading-normal">
          Finish signing in on the claude.ai page that opened in your browser;
          this updates by itself.
          {auth.url && (
            <>
              {" "}
              No page?{" "}
              <a
                href={auth.url}
                target="_blank"
                rel="noreferrer"
                className="text-fg underline decoration-white/30 underline-offset-2 hover:decoration-white"
              >
                Open the sign-in page
              </a>
              .
            </>
          )}
        </p>
      ) : (
        s?.available && (
          <div className="flex items-center gap-1.5">
            {ok ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => onAuth({ step: "confirm" })}
                title="Claude Code's own sign-out, for this whole laptop"
              >
                Sign out of Claude
              </Button>
            ) : (
              <Button size="sm" disabled={busy} onClick={onSignIn}>
                {busy ? "Opening…" : "Sign in with Claude"}
              </Button>
            )}
          </div>
        )
      )}
      {auth.error && (
        <p className="flex items-start gap-2 text-[12.5px] text-body">
          <span className="mt-1.5 size-1.5 flex-none rounded-full bg-red" />
          {auth.error}
        </p>
      )}
    </div>
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
