"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  ALL_POKEMON,
  applyOverrides,
  exportPokedexJson,
  type OverrideMap,
  type PokemonOverride,
} from "@/lib/data";
import type { Pokemon } from "@/types/pokemon";

interface OverridesState {
  overrides: OverrideMap;
  hasHydrated: boolean;
  setOne: (id: number, patch: PokemonOverride) => void;
  removeOne: (id: number) => void;
  clearAll: () => void;
  exportAsJson: () => string;
  _setHydrated: (v: boolean) => void;
}

/**
 * Single source of truth for user edits layered on top of the shipped dataset.
 * Persisted to localStorage under "pokopia:overrides" so the full app (pokedex,
 * recipes, planners) reflects whatever the /edit page changed.
 */
export const useOverridesStore = create<OverridesState>()(
  persist(
    (set, get) => ({
      overrides: {},
      hasHydrated: false,
      setOne: (id, patch) =>
        set({
          overrides: {
            ...get().overrides,
            [id]: { ...(get().overrides[id] ?? {}), ...patch },
          },
        }),
      removeOne: (id) => {
        const next = { ...get().overrides };
        delete next[id];
        set({ overrides: next });
      },
      clearAll: () => set({ overrides: {} }),
      exportAsJson: () => exportPokedexJson(get().overrides),
      _setHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: "pokopia:overrides",
      // Keep the localStorage key in sync with the legacy helpers used by
      // lib/data.ts (loadOverrides / saveOverrides). Anything written outside
      // the store (e.g. prior sessions) is picked up on hydrate.
      partialize: (state) => ({ overrides: state.overrides }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated(true);
      },
    },
  ),
);

/** All pokemon with user overrides applied. Safe for client components. */
export function useAllPokemon(): Pokemon[] {
  const overrides = useOverridesStore((s) => s.overrides);
  return useMemo(
    () => applyOverrides(ALL_POKEMON, overrides),
    [overrides],
  );
}

/** Playable-only slice with overrides applied. */
export function usePlayable(): Pokemon[] {
  const all = useAllPokemon();
  return useMemo(() => all.filter((p) => p.is_playable), [all]);
}

/** Merged pokemon by id. Returns undefined if id is out of range. */
export function usePokemonById(id: number | null | undefined): Pokemon | undefined {
  const all = useAllPokemon();
  return useMemo(() => {
    if (id == null) return undefined;
    return all.find((p) => p.id === id);
  }, [all, id]);
}
