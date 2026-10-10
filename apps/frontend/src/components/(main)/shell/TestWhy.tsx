"use client";

import { useMemo } from "react";
import { PH, PhIcon } from "@/components/ui";
import {
  checksOf,
  type Frame,
  forgeTree,
  human,
  splitArgs,
  type TestResult,
  whyOf,
} from "@/features/trace";

/*
 * Why one test passed or failed, in the test log's right pane:
 *  - one sentence of the verdict's reason (Foundry passes a test that ends without reverting)
 *  - its checks: each executed assert / expect line of the test, ✓ or ✗, with the values the
 *    calls on that line returned (forge-std's assertEq has no frame of its own; its line does)
 *  - its call trace drawn like `forge test -vvvv` (├─ └─, [gas] Contract::fn(args), emit …),
 *    the output an auditor already reads in a terminal
 */

const call = (f: Frame) =>
  splitArgs(f.args)
    .map(([k, v]) => (/^arg\d+$/.test(k) ? v : `${k}: ${v}`))
    .join(", ");

/** "LuoraVault.shares(alice) → 1,000e6", or the revert */
function CallValue({ f }: { f: Frame }) {
  return (
    <span>
      <span className="text-muted">{f.contract ?? f.to}.</span>
      <span className="text-fg">{f.fn}</span>
      <span className="text-dim">({call(f)})</span>
      {!f.ok ? (
        <span className="text-red"> ✗ revert{f.ret ? `: ${f.ret}` : ""}</span>
      ) : (
        f.ret && <span className="text-fg"> → {human(f.ret)}</span>
      )}
    </span>
  );
}

export function TestWhy({
  test,
  source,
}: {
  test: TestResult;
  /** the test file's source, for its check lines */
  source?: string;
}) {
  const { checks, failLine } = useMemo(
    () => checksOf(test, source),
    [test, source],
  );
  const tree = useMemo(() => forgeTree(test.frames), [test]);
  const tone =
    test.status === "Success"
      ? "text-green"
      : test.status === "Failure"
        ? "text-red"
        : "text-dim";

  return (
    <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
      <p className="flex gap-2 text-[13.5px] text-fg leading-normal">
        <span className={`hdr-dot mt-[7px] ${tone}`} aria-hidden="true" />
        {whyOf(test, checks, failLine)}
      </p>

      {checks.length > 0 && (
        <section className="mt-4">
          <h4 className="mb-1.5 text-[12.5px] text-muted">
            Checks <span className="text-dim">{checks.length}</span>
          </h4>
          <ol className="space-y-1 rounded-inner border border-border bg-inset px-3 py-2.5 font-mono text-[12px] leading-[1.6]">
            {checks.map((c) => (
              <li key={c.line} className="flex gap-2.5">
                <PhIcon
                  d={c.ok ? PH.check : PH.x}
                  className={`mt-[3px] size-[13px] ${c.ok ? "text-green" : "text-red"}`}
                />
                <span className="w-9 flex-none text-dim tabular-nums">
                  L{c.line}
                </span>
                <span className="min-w-0">
                  <span className="block break-words text-body">{c.code}</span>
                  {c.calls.map((f, i) => (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: calls on one line, in order
                      key={i}
                      className="block break-words text-[11.5px]"
                    >
                      <CallValue f={f} />
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-4">
        <h4 className="mb-1.5 text-[12.5px] text-muted">
          Call trace{" "}
          <span className="font-mono text-[11.5px] text-dim">
            as forge test -vvvv
          </span>
        </h4>
        <ol className="overflow-x-auto rounded-inner border border-border bg-inset px-3 py-2.5 font-mono text-[12px] leading-[1.7]">
          {tree.map(({ prefix, frame: f }, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: frames in trace order
            <li key={i} className="whitespace-pre">
              <span className="text-dim">{prefix}</span>
              {f.kind === "EVENT" ? (
                <>
                  <span className="text-muted">emit </span>
                  <span className="text-fg">{f.fn}</span>
                  <span className="text-dim">({call(f)})</span>
                </>
              ) : (
                <>
                  {f.gas != null && (
                    <span className="text-dim">
                      [{f.gas.toLocaleString("en-US")}]{" "}
                    </span>
                  )}
                  <span
                    className={f.contract === "vm" ? "text-dim" : "text-muted"}
                  >
                    {f.contract ?? f.to}::
                  </span>
                  <span
                    className={f.contract === "vm" ? "text-muted" : "text-fg"}
                  >
                    {f.fn}
                  </span>
                  <span className="text-dim">({call(f)})</span>
                  {f.kind === "STATICCALL" && (
                    <span className="text-dim"> [staticcall]</span>
                  )}
                  {!f.ok ? (
                    <span className="text-red">
                      {" "}
                      ← [Revert]{f.ret ? ` ${f.ret}` : ""}
                    </span>
                  ) : (
                    f.ret && <span className="text-fg"> ← {human(f.ret)}</span>
                  )}
                </>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
