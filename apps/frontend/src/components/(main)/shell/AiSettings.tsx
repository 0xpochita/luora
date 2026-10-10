"use client";

import { useRef, useState } from "react";
import { Button, Input, SegmentedControl, Select, tile } from "@/components/ui";
import {
  type AiConfig,
  type AiKind,
  aiReady,
  configFor,
  NO_AI,
  PROVIDERS,
  saveAiConfig,
  testConnection,
  useAiConfig,
} from "@/features/ai";

type Mode = "none" | "local" | "key";
const modeOf = (k: AiKind): Mode =>
  k === "none" ? "none" : k === "local" ? "local" : "key";
const KEYED: AiKind[] = ["anthropic", "openai", "openrouter"];

const NOTE: Record<Mode, string> = {
  none: "Ask answers come from Luora's built-in text. Nothing leaves your machine.",
  local:
    "Ask sends the selected piece (its source lines, connected pieces and findings) and your question to the endpoint above, from your browser. Nothing goes to a Luora server.",
  key: "Ask sends the selected piece (its source lines, connected pieces and findings) and your question straight from your browser to the provider you picked. Your key is stored only in this browser's localStorage, is sent only to that provider and is never logged or sent to Luora.",
};

type Test = { state: "idle" | "busy" | "ok" | "bad"; text?: string };

/** "AI provider" settings: none (canned answers), a local model, or the user's own API key. */
export function AiSettings() {
  const saved = useAiConfig();
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<AiConfig>(NO_AI);
  const [test, setTest] = useState<Test>({ state: "idle" });
  const mode = modeOf(draft.kind);
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
        text: `Connected · ${draft.model} replied “${reply.slice(0, 40) || "(empty)"}”`,
      });
    } catch (e) {
      setTest({ state: "bad", text: (e as Error).message });
    }
  };
  const ready = aiReady(draft);

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={`${tile(false)} h-9 gap-2 px-3.5 text-[13px]`}
      >
        <span
          className={`size-1.5 rounded-full ${saved.kind === "none" ? "bg-dim" : "bg-green"}`}
        />
        AI · {saved.kind === "none" ? "None" : PROVIDERS[saved.kind].label}
      </button>
      <dialog
        ref={dialog}
        aria-label="AI provider"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        onKeyDown={(e) => e.key === "Escape" && e.stopPropagation()}
        className="m-auto w-[min(480px,calc(100vw-32px))] rounded-card border border-border bg-card-grad p-0 text-fg shadow-float backdrop:bg-black/55 backdrop:backdrop-blur-[2px]"
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
            onChange={(m) =>
              pick(
                m === "none" ? "none" : m === "local" ? "local" : "anthropic",
              )
            }
            options={[
              { value: "none", label: "None" },
              { value: "local", label: "Local model" },
              { value: "key", label: "Own API key" },
            ]}
          />
          {mode !== "none" && (
            <div className="flex flex-col gap-2.5 rounded-inner border border-border bg-inner-grad p-3">
              {mode === "key" && (
                <Row label="Provider">
                  <Select
                    aria-label="Provider"
                    value={draft.kind}
                    onChange={(e) => pick(e.target.value as AiKind)}
                    className="w-full"
                  >
                    {KEYED.map((k) => (
                      <option key={k} value={k}>
                        {PROVIDERS[k].label}
                      </option>
                    ))}
                  </Select>
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
              <Row label="Model">
                <Input
                  aria-label="Model"
                  value={draft.model}
                  onChange={(e) => edit({ model: e.target.value })}
                  placeholder={PROVIDERS[draft.kind].model}
                  spellCheck={false}
                  className="w-full font-mono text-[12px]"
                />
              </Row>
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
              <div className="flex items-center gap-1.5 pt-0.5">
                <Button
                  size="sm"
                  disabled={!ready || test.state === "busy"}
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
