"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { MAX_MAPS } from "@/lib/planner";
import type { Environment } from "@/types/pokemon";

export interface ManualCell {
  id: string;
  env: Environment;
  pokemonIds: number[];
}

interface ManualPlanState {
  /** cells grouped by mapIdx (0..4) */
  maps: Record<number, ManualCell[]>;
  hasHydrated: boolean;
  addCell: (mapIdx: number, env: Environment) => void;
  removeCell: (mapIdx: number, cellId: string) => void;
  setCellEnv: (mapIdx: number, cellId: string, env: Environment) => void;
  assign: (mapIdx: number, cellId: string, pokemonId: number) => void;
  unassign: (pokemonId: number) => void;
  clearAll: () => void;
  _setHydrated: (v: boolean) => void;
}

const emptyMaps = (): Record<number, ManualCell[]> => {
  const m: Record<number, ManualCell[]> = {};
  for (let i = 0; i < MAX_MAPS; i++) m[i] = [];
  return m;
};

export const useManualPlanStore = create<ManualPlanState>()(
  persist(
    (set, get) => ({
      maps: emptyMaps(),
      hasHydrated: false,
      addCell: (mapIdx, env) => {
        const next = { ...get().maps };
        const list = [...(next[mapIdx] ?? [])];
        list.push({
          id: `m${mapIdx}-c${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          env,
          pokemonIds: [],
        });
        next[mapIdx] = list;
        set({ maps: next });
      },
      removeCell: (mapIdx, cellId) => {
        const next = { ...get().maps };
        next[mapIdx] = (next[mapIdx] ?? []).filter((c) => c.id !== cellId);
        set({ maps: next });
      },
      setCellEnv: (mapIdx, cellId, env) => {
        const next = { ...get().maps };
        next[mapIdx] = (next[mapIdx] ?? []).map((c) =>
          c.id === cellId ? { ...c, env } : c,
        );
        set({ maps: next });
      },
      assign: (mapIdx, cellId, pokemonId) => {
        const state = get();
        // Remove from any existing cell first
        const cleaned: Record<number, ManualCell[]> = {};
        for (const [k, cells] of Object.entries(state.maps)) {
          cleaned[Number(k)] = cells.map((c) => ({
            ...c,
            pokemonIds: c.pokemonIds.filter((id) => id !== pokemonId),
          }));
        }
        // Add to target
        const target = cleaned[mapIdx];
        if (!target) return;
        cleaned[mapIdx] = target.map((c) =>
          c.id === cellId && !c.pokemonIds.includes(pokemonId)
            ? { ...c, pokemonIds: [...c.pokemonIds, pokemonId] }
            : c,
        );
        set({ maps: cleaned });
      },
      unassign: (pokemonId) => {
        const next: Record<number, ManualCell[]> = {};
        for (const [k, cells] of Object.entries(get().maps)) {
          next[Number(k)] = cells.map((c) => ({
            ...c,
            pokemonIds: c.pokemonIds.filter((id) => id !== pokemonId),
          }));
        }
        set({ maps: next });
      },
      clearAll: () => set({ maps: emptyMaps() }),
      _setHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: "pokopia:manual-plan",
      onRehydrateStorage: () => (state) => {
        state?._setHydrated(true);
      },
    },
  ),
);

/** Returns all assigned pokemon ids flat across maps. */
export function allAssignedIds(maps: Record<number, ManualCell[]>): Set<number> {
  const s = new Set<number>();
  for (const cells of Object.values(maps)) {
    for (const c of cells) for (const id of c.pokemonIds) s.add(id);
  }
  return s;
}

/** Total headcount in a given map. */
export function mapHeadcount(cells: ManualCell[]): number {
  let n = 0;
  for (const c of cells) n += c.pokemonIds.length;
  return n;
}
