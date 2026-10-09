import { AskDemo } from "./AskDemo";
import { Reveal } from "./motion";
import { demoAtlas } from "./stats";

/**
 * Ask about a line. Heading row from R4 (Linear); the demo below is Genie's 'Prompts in. Magic out.'
 * carousel + prompt, see AskDemo.tsx. The answers are the app's own `aiAnswer` output for the piece
 * on the centre card. The row runs full width (main clips it). The section is one screen tall: the
 * header, row and prompt box size off the viewport height (svh) so the whole answer stays in view.
 * Genie never lets this block feel empty: its own warm backdrop, big clouds rising from a bottom
 * corner over the prompt box. Here a warmer graphite stage (the page tone shifts too, motion.tsx),
 * a faint dot field, oversized blurred code glyphs drifting far back, and a haze from the bottom
 * left that spills over the box (ask.css; CSS only, transform/opacity, scroll-driven).
 */
const GLYPHS = ["58", "require(", "{ }", "msg.sender", "L47", "0x"];
export async function Ask() {
  const atlas = await demoAtlas();
  return (
    <section
      id="ask"
      data-tone="ask"
      className="relative isolate mx-auto flex h-[100svh] min-h-[560px] max-w-[1240px] flex-col px-4 py-[clamp(10px,1.4svh,44px)] md:py-[clamp(12px,2.8svh,44px)] md:px-6"
    >
      <div aria-hidden="true" className="lp-ask-stage">
        <div className="lp-ask-dots" />
        {GLYPHS.map((g) => (
          <span key={g} className="lp-ask-glyph">
            {g}
          </span>
        ))}
        <div className="lp-ask-haze" />
      </div>
      <Reveal className="mb-[clamp(8px,1.2svh,32px)] grid shrink-0 gap-1.5 md:mb-[clamp(8px,2.2svh,32px)] md:grid-cols-2 md:items-end md:gap-6">
        <h2 className="font-medium text-[clamp(26px,min(4.4vw,5.6svh),54px)] text-fg leading-[1.04] tracking-[-0.03em]">
          Ask about the line,
          <br />
          <span className="text-white/45">not the whole file.</span>
        </h2>
        <p className="max-w-[460px] text-[13px] text-muted leading-normal md:text-[clamp(13px,1.8svh,16px)] md:leading-relaxed md:justify-self-end">
          Every line of the contract belongs to a function, slot or call. Pick
          one and Luora answers about that piece: what it does, what to check,
          and a Foundry test that pins the safe behaviour.
        </p>
      </Reveal>
      <Reveal className="min-h-0 flex-1">
        <AskDemo atlas={atlas} />
      </Reveal>
      <div aria-hidden="true" className="lp-ask-haze lp-ask-haze-front" />
    </section>
  );
}
