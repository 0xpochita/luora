"use client";

import type React from "react";
import { useRunIfAny } from "@/features/run";

/*
 * Suspense / loading fallbacks, one per page, shaped like the page that replaces them (same
 * columns, header rows and card positions), so nothing jumps when the data arrives. Graphite
 * blocks on the dot grid, one slow pulse; no spinners.
 */

const CARD = "rounded-card border border-border bg-card-grad shadow-soft";
const keys = (n: number, p: string) =>
  Array.from({ length: n }, (_, i) => `${p}-${i}`);

/** a grey bar standing in for a line of text or a control */
function Bone({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style} className={`rounded-full bg-raised ${className}`} />
  );
}

/** a node card: title above, graphite card with port rows (Atlas Graph, Explore Map) */
function NodeCard({ rows, w = "w-[300px]" }: { rows: number; w?: string }) {
  return (
    <div className={w}>
      <Bone className="mb-2.5 ml-1 h-3 w-24" />
      <div className={`p-2 ${CARD}`}>
        <div className="rounded-inner border border-border bg-inner-grad px-3 py-3">
          <Bone className="h-3 w-20" />
          {keys(rows, "r").map((k) => (
            <Bone key={k} className="mt-4 ml-auto h-2.5 w-28" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** one line of copy: the bone centred in the box the real line takes (`box` = its line height) */
function Line({ box, w }: { box: string; w: string }) {
  return (
    <div className={`flex items-center ${box}`}>
      <Bone className={`h-2.5 ${w}`} />
    </div>
  );
}

/** a Start step (RunDialog Step): number chip, title, its command rows or the drop zone, the note */
function StepBones({
  title,
  copy = [],
  drop = false,
  note,
  noteBox = "h-[18.75px]",
}: {
  title: string;
  /** lines per command row (a long command wraps) */
  copy?: number[];
  drop?: boolean;
  /** widths of the note's lines */
  note: string[];
  /** a note with inline code sets its lines a touch taller */
  noteBox?: string;
}) {
  return (
    <li className="flex gap-3 rounded-inner border border-border bg-inner-grad p-3">
      {/* on the card's light top edge bg-raised vanishes: these bones take bg-hover */}
      <span className="size-6 flex-none rounded-chip bg-hover" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="pt-0.5">
          <Line box="h-[21px]" w={`${title} bg-hover!`} />
        </div>
        {copy.map((n, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed rows
            key={i}
            className="flex items-center gap-1.5 rounded-tile bg-inset py-1 pr-1 pl-3"
          >
            <div className="min-w-0 flex-1 py-1">
              {keys(n, "l").map((k, j) => (
                <Line
                  key={k}
                  box="h-[19.5px]"
                  w={j === n - 1 ? "w-[46%]" : "w-[78%]"}
                />
              ))}
            </div>
            <span className="flex h-8 items-center px-2">
              <Bone className="h-2.5 w-8" />
            </span>
          </div>
        ))}
        {drop && (
          <div className="flex flex-col items-center gap-1 rounded-tile border border-border-strong border-dashed bg-inset px-4 py-5">
            <Line box="h-[21px]" w="w-60 max-w-[70%]" />
            <Line box="h-[18.75px]" w="w-80 max-w-[90%]" />
          </div>
        )}
        <div>
          {note.map((w, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed lines
            <Line key={i} box={noteBox} w={`${w} bg-hover!`} />
          ))}
        </div>
      </div>
    </li>
  );
}

/**
 * Trace and Atlas with nothing loaded: the Start page (StartHere), block for block: the pill, the
 * title and its three lines, the sample button with its note, the For Human / For Agent switch and
 * the four steps.
 */
export function StartSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 animate-pulse overflow-hidden px-3 pb-3">
      <div className="m-auto w-[min(720px,100%)] py-8">
        <Bone className="mb-3 h-7 w-[101px] border border-border" />
        <Line box="h-[clamp(30px,3.75vw,40px)]" w="h-6! w-[300px]" />
        <div className="mt-2 max-w-[560px]">
          <Line box="h-[22.75px]" w="w-full" />
          <Line box="h-[22.75px]" w="w-[96%]" />
          <Line box="h-[22.75px]" w="w-[34%]" />
        </div>
        <div className="mt-5 flex items-center gap-x-4">
          <Bone className="h-8 w-[178px] flex-none rounded-tile" />
          <div className="min-w-0 flex-1">
            <Line box="h-[18.75px]" w="w-full" />
            <Line box="h-[18.75px]" w="w-[8%]" />
          </div>
        </div>
        <div className="mt-8 flex gap-1.5">
          <Bone className="h-7 w-[112px] rounded-tile" />
          <Bone className="h-7 w-[104px] rounded-tile" />
        </div>
        <ol className="mt-3 flex flex-col gap-2">
          <StepBones title="w-28" copy={[1]} note={["w-[40%]"]} />
          <StepBones title="w-72" copy={[1, 3]} note={["w-full", "w-[22%]"]} />
          <StepBones
            title="w-24"
            copy={[1]}
            note={["w-full", "w-[94%]", "w-[44%]"]}
            noteBox="h-[19.5px]"
          />
          <StepBones
            title="w-16"
            drop
            note={["w-full", "w-[30%]"]}
            noteBox="h-[19.5px]"
          />
        </ol>
        <div className="mt-4">
          <Line box="h-[18.75px]" w="w-[72%]" />
        </div>
      </div>
    </div>
  );
}

/** Trace: tests list · call trace · source (TraceWorkspace) */
export function TraceSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 animate-pulse gap-3 px-3 pb-3">
      <div className={`w-[272px] flex-none space-y-3 p-3 ${CARD}`}>
        <div className="h-9 rounded-full border border-border" />
        {keys(7, "t").map((k) => (
          <Bone key={k} className="h-3 w-[85%]" />
        ))}
      </div>
      <div className={`flex min-w-0 flex-1 flex-col gap-4 p-5 ${CARD}`}>
        <div className="flex items-center gap-3">
          <Bone className="h-4 w-64" />
          <Bone className="h-3 w-12" />
          <span className="ml-auto flex gap-2">
            {keys(4, "b").map((k) => (
              <Bone key={k} className="h-8 w-20" />
            ))}
          </span>
        </div>
        <div className="flex gap-3">
          <Bone className="h-9 w-[360px] rounded-tile" />
          <Bone className="h-9 flex-1 rounded-tile" />
        </div>
        <Bone className="h-8 w-[480px]" />
        {keys(14, "c").map((k, i) => (
          <div key={k} className="flex items-center gap-3">
            <Bone className="h-3 w-5" />
            <div style={{ width: (i % 4) * 22 }} />
            <Bone className="h-5 w-24 rounded-[6px]" />
            <Bone className="h-3 flex-1 max-w-[420px]" />
            <Bone className="ml-auto h-1.5 w-20" />
          </div>
        ))}
      </div>
      <div className={`w-[440px] flex-none space-y-3 p-3 ${CARD}`}>
        <div className="flex gap-2">
          <Bone className="h-8 w-24 rounded-tile" />
          <Bone className="h-8 w-20 rounded-tile" />
        </div>
        <Bone className="h-10 w-full rounded-tile" />
        {keys(16, "s").map((k, i) => (
          <Bone
            key={k}
            className="h-2.5"
            style={{ width: `${40 + ((i * 37) % 50)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Atlas: one switch and the header's tools, then the Graph's columns of cards (AtlasWorkspace) */
export function AtlasSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 animate-pulse flex-col">
      <div className="flex flex-none items-center gap-3 px-3 pb-2">
        <Bone className="h-10 w-[320px] rounded-tile" />
        <span className="ml-auto flex items-center gap-2">
          <Bone className="h-8 w-36" />
          <Bone className="h-3 w-56" />
          {keys(4, "h").map((k) => (
            <Bone key={k} className="h-9 w-24" />
          ))}
        </span>
      </div>
      <div className="relative flex min-h-0 flex-1 justify-between overflow-hidden px-[12%] pt-14">
        <div className="space-y-12">
          <NodeCard rows={6} w="w-[340px]" />
          <NodeCard rows={7} w="w-[340px]" />
        </div>
        <div className="space-y-12 pt-2">
          <NodeCard rows={3} />
          <NodeCard rows={3} />
        </div>
        <div className="space-y-12 pt-16">
          <NodeCard rows={2} />
          <NodeCard rows={4} />
        </div>
        <Bone className="absolute right-3 bottom-3 h-12 w-36 rounded-card" />
      </div>
    </div>
  );
}

/** Explore gallery: pill, title, one line, then the protocol rows (ExploreGallery) */
export function ExploreSkeleton() {
  return (
    <div className="min-h-0 flex-1 animate-pulse overflow-hidden px-4 pt-10">
      <div className="mx-auto w-full max-w-[960px]">
        <Bone className="h-7 w-72" />
        <Bone className="mt-5 h-9 w-[420px] rounded-tile" />
        <Bone className="mt-4 h-3 w-[600px]" />
        <Bone className="mt-2.5 h-3 w-[440px]" />
        <div className="mt-7 flex flex-col gap-2">
          {keys(4, "p").map((k) => (
            <div key={k} className={`flex items-center gap-4 p-2 pr-5 ${CARD}`}>
              <div className="h-[132px] w-[260px] flex-none rounded-inner border border-border bg-inset" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Bone className="size-7 rounded-tile" />
                  <Bone className="h-4 w-32" />
                </div>
                <Bone className="h-3 w-[90%]" />
                <Bone className="h-3 w-[70%]" />
                <Bone className="h-3 w-[55%]" />
              </div>
              <div className="w-[148px] flex-none space-y-2.5 border-border border-l pl-5">
                <Bone className="h-3 w-24" />
                <Bone className="h-3 w-16" />
                <Bone className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** One protocol: back, name, the Map · Flows · Contract switch, numbers, Ask AI; the Map's columns */
export function ProtocolSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 animate-pulse flex-col">
      <div className="flex flex-none items-center gap-3 px-3 pb-2">
        <Bone className="h-9 w-24" />
        <Bone className="size-7 rounded-tile" />
        <Bone className="h-4 w-28" />
        <Bone className="h-10 w-[300px] rounded-tile" />
        <span className="ml-auto flex items-center gap-3">
          <Bone className="h-3 w-56" />
          <Bone className="h-9 w-24" />
        </span>
      </div>
      <div className="flex min-h-0 flex-1 gap-[120px] overflow-hidden px-6 pt-10">
        {(
          [
            ["entry", 3],
            ["logic", 4],
            ["tokens", 2],
            ["config", 3],
            ["outside", 2],
          ] as const
        ).map(([col, n], c) => (
          <div key={col} className="space-y-10">
            <Bone className="h-2.5 w-16" />
            {keys(n, col).map((k, i) => (
              <NodeCard key={k} rows={1 + ((i + c) % 4)} w="w-[200px]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The Trace or Atlas fallback, shaped like what will replace it: the Start page while nothing is
 * loaded (no LUORA_DATA_PATH run on the server, no dropped file, the sample not chosen), else the
 * workspace. `local` comes from the server: it points at a run.
 */
export function RunSkeleton({
  view,
  local,
}: {
  view: "trace" | "atlas";
  local: boolean;
}) {
  const ctx = useRunIfAny();
  if (!local && !ctx?.run && !ctx?.sample) return <StartSkeleton />;
  return view === "trace" ? <TraceSkeleton /> : <AtlasSkeleton />;
}
