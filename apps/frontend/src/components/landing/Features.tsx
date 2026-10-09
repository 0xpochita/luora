import { HowItWorks } from "./HowItWorks";
import { labDemo, testRows, traceFrames } from "./stats";

/** 'How Luora works' (HowItWorks.tsx): read from the sample run here (the atlas its last step
 *  draws from is fetched by the client, atlas.ts). */
export async function Features() {
  const [trace, lab, tests] = await Promise.all([
    traceFrames(),
    labDemo(),
    testRows(),
  ]);
  return (
    <HowItWorks
      tests={tests}
      test={trace.test}
      frames={trace.frames}
      lab={lab}
    />
  );
}
