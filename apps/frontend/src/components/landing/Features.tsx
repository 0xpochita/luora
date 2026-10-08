import { HowItWorks } from "./HowItWorks";
import { demoAtlas, labDemo, pillarData, testRows, traceFrames } from "./stats";

/** 'How Luora works' (HowItWorks.tsx): everything it draws is read from the sample run here. */
export async function Features() {
  const [atlas, trace, deep, lab, pillar, tests] = await Promise.all([
    demoAtlas(),
    traceFrames(),
    traceFrames(11),
    labDemo(),
    pillarData(),
    testRows(),
  ]);
  return (
    <HowItWorks
      stack={{
        ran: pillar.ran,
        frames: deep.frames,
        lab,
        findings: pillar.findings,
        fns: pillar.fns,
      }}
      tests={tests}
      test={trace.test}
      frames={trace.frames}
      lab={lab}
      atlas={atlas}
    />
  );
}
