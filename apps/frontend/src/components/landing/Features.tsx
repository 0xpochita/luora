import { HowItWorks } from "./HowItWorks";
import { demoAtlas, labDemo, testRows, traceFrames } from "./stats";

/** 'How Luora works' (HowItWorks.tsx): everything it draws is read from the sample run here. */
export async function Features() {
  const [atlas, trace, lab, tests] = await Promise.all([
    demoAtlas(),
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
      atlas={atlas}
    />
  );
}
