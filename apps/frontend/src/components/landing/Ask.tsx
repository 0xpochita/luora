import { AskDemo } from "./AskDemo";
import { Reveal } from "./motion";

/**
 * Ask about a line. Heading row from R4 (Linear); the demo below is Genie's 'Prompts in. Magic out.'
 * carousel + prompt, see AskCarousel.tsx (AskDemo.tsx loads it). The answers are the app's own `aiAnswer` output for the piece
 * on the centre card. The row runs full width (main clips it).
 */
export function Ask() {
  return (
    <section
      id="ask"
      data-tone="ask"
      className="mx-auto max-w-[1240px] px-4 pb-32 md:px-6"
    >
      <Reveal className="mb-12 grid gap-6 md:grid-cols-2 md:items-end">
        <h2 className="font-medium text-[clamp(32px,4.4vw,54px)] text-fg leading-[1.04] tracking-[-0.03em]">
          Ask about the line,
          <br />
          <span className="text-white/45">not the whole file.</span>
        </h2>
        <p className="max-w-[460px] text-[16px] text-muted leading-relaxed md:justify-self-end">
          Every line of the contract belongs to a function, slot or call. Pick
          one and Luora answers about that piece: what it does, what to check,
          and a Foundry test that pins the safe behaviour.
        </p>
      </Reveal>
      <Reveal>
        <AskDemo />
      </Reveal>
    </section>
  );
}
