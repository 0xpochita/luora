"use client";

import { ChainLogo, Dropdown, PH, PhIcon } from "@/components/ui";
import { splitChain } from "@/features/run/utils/test-run";
import type { ChainInfo } from "@/features/trace";

/*
 * Which run Trace and Atlas show: the local one, or the same tests on a fork of a testnet
 * (`node luora-export.mjs --forks all`). One choice for both pages (useRun().fork).
 *  - a fork icon names the control (Tenderly marks a forked network the same way)
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
        <span className="inline-flex items-center gap-1.5">
          <PhIcon d={PH.gitFork} className="size-[13px]" />
          Fork
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
