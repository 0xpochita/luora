"use client";

import { useMemo } from "react";
import { createAtlasModel } from "@/features/atlas";
import type { ProtocolContract } from "@/features/explore";
import { LabView } from "../atlas/lab/LabView";
import "../atlas/atlas.css";

/**
 * One contract of the protocol in the Atlas Lab's contract graph, as it is (only="contract"):
 * the same pieces luora-atlas.mjs maps for the auditor's own project.
 */
export function ContractLab({
  contract,
  selected,
  onSelect,
}: {
  contract: ProtocolContract;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const model = useMemo(
    () => createAtlasModel(contract.atlas),
    [contract.atlas],
  );
  return (
    <div className="atlas absolute inset-0">
      <section className="stage flex flex-1 flex-col">
        <LabView
          key={contract.name}
          model={model}
          selected={selected}
          onSelect={onSelect}
          only="contract"
        />
      </section>
    </div>
  );
}
