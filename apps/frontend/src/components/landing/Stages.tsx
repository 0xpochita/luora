import {
  flaggedLines,
  lineRanges,
  reportsOf,
  SEVERITY_LABEL,
  splitFix,
  TOOL_LABEL,
  titleOf,
} from "@/features/atlas/utils/findings";
import { createAtlasModel } from "@/features/atlas/utils/model";
import { FindingsWheel } from "./FindingsWheel";
import { RunSentence } from "./RunSentence";
import { demoAtlas, scenarioDemo, testRows } from "./stats";
import { TestDrift } from "./TestDrift";

/** Server halves of the scroll stages: read the sample run, hand plain data to the client stage. */

export async function Run() {
  const scenario = await scenarioDemo();
  return scenario ? <RunSentence scenario={scenario} /> : null;
}

export async function Findings() {
  const model = createAtlasModel(await demoAtlas());
  const findings = model.findings.map((f) => {
    const rs = reportsOf(f);
    return {
      id: f.name.slice(0, 4),
      title: titleOf(f),
      risk: f.risk ?? "low",
      severity: SEVERITY_LABEL[f.risk ?? "low"],
      tools: [...new Set(rs.map((r) => TOOL_LABEL[r.tool]))].join(" + "),
      where: `${f.detector ?? rs[0]?.detector ?? ""} · L${lineRanges(flaggedLines(f, model.lineOf(f)))}`,
      what: splitFix(f.desc)[0],
    };
  });
  return <FindingsWheel findings={findings} />;
}

export async function Tests() {
  const tests = await testRows();
  return (
    <TestDrift
      tests={tests.map((t) => ({
        name: t.name,
        suite: t.suite,
        ok: t.status === "Success",
      }))}
    />
  );
}
