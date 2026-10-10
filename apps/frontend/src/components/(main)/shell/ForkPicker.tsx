"use client";

import { ChainLogo, Dropdown, PH, PhIcon } from "@/components/ui";
import { splitChain } from "@/features/run/utils/test-run";
import type { ChainInfo } from "@/features/trace";

/*
 * Which run Trace and Atlas show: the local one, or the same tests on a fork of a testnet
 * (`node luora-export.mjs --forks all`). One choice for both pages (useRun().fork).
 *  - the control's name as a tag, a hairline, then the chain (Tenderly badges a forked network
 *    "Fork" the same way), so "Fork" never reads as part of the chain's name
 *  - each chain as its ringed mark and its name, brand first and the network quieter
 *    (Etherscan / Blockscout: "Base" then "Sepolia"), its chain id at the menu's right edge to
 *    check against
 */

/** "Base Sepolia" as Base, then Sepolia in the quiet tone; or explicit parts ("Local", "no fork"). */
export function ChainName({ parts }: { parts: [string, string] }) {
  return (
    <span className="truncate">
      <span className="text-fg">{parts[0]}</span>
      {parts[1] && <span className="ml-1.5 text-dim">{parts[1]}</span>}
    </span>
  );
}

export function ForkPicker({
  forks,
  value,
  onChange,
}: {
  forks: Record<string, { chain: ChainInfo }>;
  value: string;
  onChange: (key: string) => void;
}) {
  const runs = Object.entries(forks);
  if (!runs.length) return null;
  return (
    <Dropdown
      variant="pill"
      label={
        // the control's name as its own tag, a hairline, then the chain: never read as one name
        <span className="-ml-1.5 inline-flex items-center gap-2.5">
          <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-white/[.06] px-2 font-medium text-[10.5px] text-muted uppercase tracking-[0.08em] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
            <PhIcon d={PH.gitFork} className="size-3" />
            Fork
          </span>
          <span aria-hidden="true" className="h-4 w-px bg-white/10" />
        </span>
      }
      ariaLabel="Which chain the tests ran on"
      value={forks[value] ? value : "local"}
      onChange={(v) => onChange(v === "local" ? "" : v)}
      options={[
        {
          value: "local" as string,
          label: <ChainName parts={["Local", "no fork"]} />,
          text: "Local",
          title: "The plain local run: forge test on an empty chain",
          icon: <ChainLogo family="local" />,
        },
        ...runs.map(([key, run]) => ({
          value: key,
          label: <ChainName parts={splitChain(run.chain.name)} />,
          text: run.chain.name,
          title: `${run.chain.name} (chain ${run.chain.id}) at block ${run.chain.block.toLocaleString()}: the tests ran on a copy of its state, nothing was sent`,
          icon: <ChainLogo family={run.chain.family} />,
          hint: run.chain.id,
          group: "Testnet forks",
        })),
      ]}
      placeholder="Local"
    />
  );
}
