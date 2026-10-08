import { CountUp, Reveal } from "./motion";
import { sampleRun } from "./stats";

/**
 * R9 (Nrok: stats as cards, giant faint wordmark behind) + R10 (bento proof: two-tone heading card,
 * stat cards, chips card) + R4 (big number, tiny caption). Every value is read from the sample run.
 */
export async function Proof() {
  const { stats, tools, file } = await sampleRun();
  return (
    <section className="relative mx-auto max-w-[1240px] overflow-hidden px-4 pb-32 md:px-6">
      <p
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-6 select-none text-center font-medium text-[clamp(120px,26vw,360px)] text-white/[.025] leading-none tracking-[-0.06em]"
      >
        luora
      </p>
      <div className="relative grid grid-cols-2 gap-3 md:grid-cols-4">
        <Reveal className="col-span-2 md:row-span-2">
          <div className="dot-grid flex h-full min-h-[300px] flex-col justify-between rounded-[20px] border border-white/[.07] bg-[#0c0c0d] p-7">
            <h2 className="font-medium text-[clamp(30px,3.6vw,44px)] text-fg leading-[1.05] tracking-[-0.025em]">
              Measured, not claimed.
              <br />
              <span className="text-white/45">On the sample vault.</span>
            </h2>
            <p className="mt-10 max-w-[380px] text-[14px] text-muted leading-relaxed">
              One run of{" "}
              <span className="font-mono text-[13px] text-text">
                node luora-export.mjs
              </span>{" "}
              over{" "}
              <span className="font-mono text-[13px] text-text">{file}</span>.
              The page reads these numbers from that output when it is built.
            </p>
          </div>
        </Reveal>
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={(i % 2) * 0.08}>
            <div className="flex h-full min-h-[148px] flex-col justify-between rounded-[20px] border border-white/[.07] bg-[#0c0c0d] bg-[radial-gradient(120%_90%_at_100%_100%,rgba(255,255,255,.07),transparent_55%)] p-5 md:p-6">
              <p className="text-[clamp(34px,3.6vw,46px)] text-fg leading-none tracking-[-0.04em]">
                <CountUp value={s.value} />
              </p>
              <p className="mt-4 text-[13px] text-muted leading-snug">
                {s.label}
                <span className="block text-dim">on the sample vault</span>
              </p>
            </div>
          </Reveal>
        ))}
        <Reveal
          className={stats.length % 2 ? "md:col-span-1" : "md:col-span-2"}
        >
          <div className="flex h-full flex-col justify-between gap-6 rounded-[20px] border border-white/[.07] bg-[#0c0c0d] p-6">
            <ul className="flex flex-wrap gap-2">
              {tools.map((t) => (
                <li
                  key={t}
                  className="rounded-chip border border-white/[.08] px-2.5 py-1 font-mono text-[12px] text-body"
                >
                  {t}
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-dim">
              The toolchain behind these numbers.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
