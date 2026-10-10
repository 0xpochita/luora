"use client";

import { ChainLogo, Dropdown } from "@/components/ui";
import type { ChainInfo } from "@/features/trace";

/**
 * Which run Trace and Atlas show: the local one, or the same tests on a fork of a testnet
 * (`node luora-export.mjs --forks all`). One choice for both pages (useRun().fork).
 */
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
      label="Fork"
      ariaLabel="Which chain the tests ran on"
      value={forks[value] ? value : "local"}
      onChange={(v) => onChange(v === "local" ? "" : v)}
      options={[
        {
          value: "local" as string,
          label: "Local (no fork)",
          text: "Local",
          title: "The plain local run: forge test on an empty chain",
        },
        ...runs.map(([key, run]) => ({
          value: key,
          label: run.chain.name,
          text: run.chain.name,
          title: `${run.chain.name} (chain ${run.chain.id}) at block ${run.chain.block.toLocaleString()}: the tests ran on a copy of its state, nothing was sent`,
          icon: <ChainLogo family={run.chain.family} />,
          group: "Testnet forks",
        })),
      ]}
      placeholder="Local (no fork)"
    />
  );
}
