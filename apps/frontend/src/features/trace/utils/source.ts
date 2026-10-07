import type { Frame, LuoraData } from "../types";

export type SourceSpan = { file: string; start: number; end: number };

/** Find the file + line range of the function (or event/modifier) a frame executed. */
export function locateFrame(data: LuoraData, f: Frame): SourceSpan | null {
  const file =
    f.file ??
    Object.keys(data.sources).find((p) =>
      new RegExp(`(contract|interface)\\s+${f.contract}\\b`).test(
        data.sources[p],
      ),
    );
  if (!file || !data.sources[file]) return null;
  const lines = data.sources[file].split("\n");
  let start = lines.findIndex((l) =>
    new RegExp(`(function|event|modifier)\\s+${f.fn}\\b`).test(l),
  );
  if (start < 0)
    start = Math.max(
      0,
      lines.findIndex((l) => l.includes(f.fn)),
    );
  let end = start;
  let depth = 0;
  for (let i = start; i < lines.length; i++) {
    depth +=
      (lines[i].match(/{/g) ?? []).length - (lines[i].match(/}/g) ?? []).length;
    end = i;
    if (depth <= 0 && (i > start || !lines[i].includes("{"))) break;
  }
  return { file, start, end };
}
