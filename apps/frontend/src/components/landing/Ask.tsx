import { AskDemo } from "./AskDemo";
import { Reveal } from "./motion";
import { demoAtlas } from "./stats";

/**
 * Ask about a line. R4 (Linear: copy column + real product UI), kept bare at the user's request:
 * no frames or docks, code on the left, the answer and three question pills on the right.
 * The answers are the app's own `aiAnswer` output for the piece that owns the clicked line.
 */
export async function Ask() {
  const atlas = await demoAtlas();
  return (
    <section id="ask" className="mx-auto max-w-[1240px] px-4 pb-32 md:px-6">
      <Reveal className="mb-12 grid gap-6 md:grid-cols-2 md:items-end">
        <h2 className="font-medium text-[clamp(32px,4.4vw,54px)] text-fg leading-[1.04] tracking-[-0.03em]">
          Ask about the line,
          <br />
          <span className="text-white/45">not the whole file.</span>
        </h2>
        <p className="max-w-[460px] text-[16px] text-muted leading-relaxed md:justify-self-end">
          Click any line of the contract. Luora knows which function, slot or
          call it belongs to, and answers about that piece: what it does, what
          to check, and a Foundry test that pins the safe behaviour.
        </p>
      </Reveal>
      <Reveal>
        <AskDemo atlas={atlas} />
      </Reveal>
    </section>
  );
}
