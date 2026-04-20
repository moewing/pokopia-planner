"use client";

import { create, type StoreApi, type UseBoundStore } from "zustand";
import { persist } from "zustand/middleware";

import { getPokemonById, getPlayable } from "@/lib/data";
import { useAllPokemon } from "@/store/overrides-store";
import { rolesFor, type CycleRole } from "@/lib/cycles";
import type { Pokemon } from "@/types/pokemon";

/**
 * Selection store factory. We run two instances (early / late) so the two
 * planners can hold independent pools, each persisted under its own key.
 */
export interface PlannerSelectionState {
  selectedIds: number[];
  hasHydrated: boolean;
  add: (id: number) => void;
  remove: (id: number) => void;
  toggle: (id: number) => void;
  set: (ids: number[]) => void;
  clear: () => void;
  addAllPlayable: () => void;
  addCycleStarterPack: () => void;
  _setHydrated: (v: boolean) => void;
}

function createPlannerStore(
  persistKey: string,
): UseBoundStore<StoreApi<PlannerSelectionState>> {
  return create<PlannerSelectionState>()(
    persist(
      (set, get) => ({
        selectedIds: [],
        hasHydrated: false,
        add: (id) => {
          if (get().selectedIds.includes(id)) return;
          const p = getPokemonById(id);
          if (!p || !p.is_playable) return;
          set({ selectedIds: [...get().selectedIds, id] });
        },
        remove: (id) =>
          set({ selectedIds: get().selectedIds.filter((x) => x !== id) }),
        toggle: (id) => {
          const { selectedIds, add, remove } = get();
          if (selectedIds.includes(id)) remove(id);
          else add(id);
        },
        set: (ids) => {
          const unique = [...new Set(ids)].filter((id) => {
            const p = getPokemonById(id);
            return p?.is_playable === true;
          });
          set({ selectedIds: unique });
        },
        clear: () => set({ selectedIds: [] }),
        addAllPlayable: () =>
          set({ selectedIds: getPlayable().map((p) => p.id) }),
        addCycleStarterPack: () => {
          const playable = getPlayable();
          const needs: CycleRole[] = [
            "litter_wood",
            "process_wood",
            "litter_brick",
            "process_brick",
            "litter_iron",
            "process_recycle",
            "process_iron",
            "gather",
            "gather",
            "gather",
          ];
          const picked = new Set<number>();
          for (const role of needs) {
            const p = playable.find(
              (x) => !picked.has(x.id) && rolesFor(x).cycle.has(role),
            );
            if (p) picked.add(p.id);
          }
          set({ selectedIds: [...picked] });
        },
        _setHydrated: (v) => set({ hasHydrated: v }),
      }),
      {
        name: persistKey,
        onRehydrateStorage: () => (state) => {
          state?._setHydrated(true);
        },
      },
    ),
  );
}

// Two independent instances — early and late planners don't share selection.
export const usePlannerStore = createPlannerStore("pokopia:planner-early");
export const useLatePlannerStore = createPlannerStore("pokopia:planner-late");

/** Convenience: resolve selected ids to Pokemon objects (applies overrides). */
export function useSelectedPokemonFrom(
  storeHook: UseBoundStore<StoreApi<PlannerSelectionState>>,
): Pokemon[] {
  const ids = storeHook((s) => s.selectedIds);
  const all = useAllPokemon();
  const byId = new Map(all.map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is Pokemon => !!p);
}

/** Backwards-compatible alias for the early planner. */
export function useSelectedPokemon(): Pokemon[] {
  return useSelectedPokemonFrom(usePlannerStore);
}
