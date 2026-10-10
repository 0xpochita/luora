"use client";

import { useState } from "react";
import { type RunFile, useShownSource } from "@/features/run";
import {
  type DisplayKind,
  locateFrame,
  type TraceMode,
  type TraceSource,
} from "@/features/trace";
import { CallGraph } from "../graph/CallGraph";
import { Sidebar } from "../shell/Sidebar";
import { Topbar } from "../shell/Topbar";
import { SourcePanel } from "../source/SourcePanel";
import { BalancePanels } from "./BalancePanels";
import { StatusBar } from "./StatusBar";
import { TestList } from "./TestList";
import { TraceHeader } from "./TraceHeader";
import { TraceList } from "./TraceList";

const fromFile = (data: RunFile): TraceSource => ({ data, origin: "file" });

/** Client root of the trace page: a dropped luora-data.json wins over the server's. */
export function TraceWorkspace({ source }: { source: TraceSource }) {
  const shown = useShownSource(source, fromFile);
  return shown.source && <TraceBody key={shown.key} source={shown.source} />;
}

/** Owns test / frame / mode / filter selection. */
function TraceBody({ source }: { source: TraceSource }) {
  const { data } = source;
  const files = Object.keys(data.sources);
  const [testIdx, setTestIdx] = useState(() =>
    Math.max(
      0,
      data.tests.findIndex((t) => t.frames.length > 8),
    ),
  );
  const [mode, setMode] = useState<TraceMode>("trace");
  const [hidden, setHidden] = useState<Set<DisplayKind>>(new Set());
  const [frameIdx, setFrameIdx] = useState<number | null>(null);
  const [file, setFile] = useState(files[0] ?? "");

  const test = data.tests[testIdx];
  const frame = frameIdx != null ? test?.frames[frameIdx] : undefined;
  const span = frame ? locateFrame(data, frame) : null;

  const selectFrame = (i: number) => {
    setFrameIdx(i);
    const s = locateFrame(data, test.frames[i]);
    if (s) setFile(s.file);
  };
  const toggle = (k: DisplayKind) =>
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  if (!test)
    return <p className="p-10 text-muted">No tests in luora-data.json.</p>;

  return (
    <div className="flex min-h-0 flex-1 gap-3 px-3 pb-3">
      <Sidebar>
        <TestList
          tests={data.tests}
          selected={testIdx}
          onSelect={(i) => {
            setTestIdx(i);
            setFrameIdx(null);
          }}
        />
      </Sidebar>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Topbar
          crumb={test.name}
          tests={data.tests.length}
          sources={files.length}
          forgeVersion={data.forgeVersion}
        />
        <div className="flex min-h-0 flex-1 gap-3">
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-card-grad shadow-soft">
            <TraceHeader
              title={test.name}
              mode={mode}
              onMode={setMode}
              hidden={hidden}
              onToggle={toggle}
            />
            <div
              className={`flex-1 overflow-auto px-5 pb-5 ${mode === "graph" ? "flex flex-col" : ""}`}
            >
              <StatusBar
                test={test}
                command={data.command}
                exportedAt={data.generatedAt}
              />
              {mode === "trace" ? (
                <>
                  <TraceList
                    frames={test.frames}
                    hidden={hidden}
                    selected={frameIdx}
                    onSelect={selectFrame}
                  />
                  <BalancePanels transfers={test.transfers} />
                </>
              ) : (
                <div className="min-h-0 flex-1">
                  <CallGraph
                    frames={test.frames}
                    hidden={hidden}
                    selected={frameIdx}
                    onSelect={selectFrame}
                  />
                </div>
              )}
            </div>
          </main>
          <SourcePanel
            sources={data.sources}
            file={file}
            onFile={setFile}
            span={span}
            caption={frame ? `${frame.to}.${frame.fn}` : null}
          />
        </div>
      </div>
    </div>
  );
}
