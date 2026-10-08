"use client";

import { useEffect, useState } from "react";
import type { Scenario } from "../utils/lab-scenario";

type Store = { list: Scenario[]; current: string };

/**
 * The Lab's scenarios, kept in localStorage per contract. A contract seen for the first time
 * starts with its templates.
 */
export function useScenarios(contract: string, seed: () => Scenario[]) {
  const key = `luora.lab.${contract}`;
  const [store, setStore] = useState<Store>({ list: [], current: "" });

  // biome-ignore lint/correctness/useExhaustiveDependencies: load once per contract; seed is a fresh closure each render
  useEffect(() => {
    let next: Store | null = null;
    try {
      next = JSON.parse(localStorage.getItem(key) ?? "null");
    } catch {}
    if (!next?.list?.length) {
      const list = seed();
      next = { list, current: list[0]?.id ?? "" };
    }
    setStore(next);
  }, [key]);

  const save = (next: Store) => {
    setStore(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  };
  const current =
    store.list.find((s) => s.id === store.current) ?? store.list[0] ?? null;

  return {
    list: store.list,
    current,
    select: (id: string) => save({ ...store, current: id }),
    update: (f: (s: Scenario) => Scenario) =>
      current &&
      save({
        ...store,
        list: store.list.map((s) => (s.id === current.id ? f(s) : s)),
      }),
    add: (s: Scenario) => save({ list: [...store.list, s], current: s.id }),
    remove: (id: string) => {
      const list = store.list.filter((s) => s.id !== id);
      save({ list, current: list[0]?.id ?? "" });
    },
  };
}

export type ScenarioStore = ReturnType<typeof useScenarios>;
