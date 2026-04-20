import rawData from "@/data/pokemon.json";
import type {
  DataConstants,
  Environment,
  PokedexData,
  Pokemon,
  Taste,
} from "@/types/pokemon";

// Single cast at module load — the JSON is authored against PokedexData,
// but TS infers it as a deeply-readonly literal so we normalize here.
const DATA = rawData as unknown as PokedexData;

export const CONSTANTS: DataConstants = DATA.constants;
export const ALL_POKEMON: readonly Pokemon[] = DATA.pokemon;
export const SCHEMA_VERSION = DATA.schema_version;
export const DATA_GENERATED_AT = DATA.generated_at;

const BY_ID: ReadonlyMap<number, Pokemon> = new Map(
  ALL_POKEMON.map((p) => [p.id, p]),
);

// ---------------------------------------------------------------------------
// Pure lookups (safe for server components)
// ---------------------------------------------------------------------------

export function getAllPokemon(): Pokemon[] {
  return [...ALL_POKEMON];
}

/** Playable only — exclude 百变怪 (#47) and 12 神兽. Use this in planner / similarity / cycles. */
export function getPlayable(): Pokemon[] {
  return ALL_POKEMON.filter((p) => p.is_playable);
}

export function getPokemonById(id: number): Pokemon | undefined {
  return BY_ID.get(id);
}

export function bySpecialty(specialty: string): Pokemon[] {
  return ALL_POKEMON.filter((p) => p.specialties.includes(specialty));
}

export function byEnv(env: Environment | null): Pokemon[] {
  return ALL_POKEMON.filter((p) => p.env === env);
}

export function byLike(like: string): Pokemon[] {
  return ALL_POKEMON.filter((p) => p.likes.includes(like));
}

export function byTaste(taste: Taste): Pokemon[] {
  return ALL_POKEMON.filter((p) => tastesOverlap(p.taste, taste));
}

/**
 * Fuzzy search: id (numeric), name, traditional-chinese name, or English specialty.
 * Empty query returns [].
 */
export function search(query: string): Pokemon[] {
  const q = query.trim();
  if (!q) return [];
  if (/^\d+$/.test(q)) {
    const hit = getPokemonById(Number(q));
    return hit ? [hit] : [];
  }
  const qLow = q.toLowerCase();
  return ALL_POKEMON.filter(
    (p) =>
      p.name.includes(q) ||
      (p.name_tw?.includes(q) ?? false) ||
      p.specialties_en.some((s) => s.toLowerCase().includes(qLow)),
  );
}

// ---------------------------------------------------------------------------
// Taste helpers — taste is string | string[] | null
// ---------------------------------------------------------------------------

export function tasteToArray(t: Pokemon["taste"]): Taste[] {
  if (!t) return [];
  return Array.isArray(t) ? (t as Taste[]) : [t as Taste];
}

export function tastesOverlap(
  a: Pokemon["taste"],
  b: Pokemon["taste"] | Taste,
): boolean {
  const A = tasteToArray(a);
  const B = Array.isArray(b) || b === null || b === undefined
    ? tasteToArray(b as Pokemon["taste"])
    : tasteToArray(b as Taste);
  if (A.length === 0 || B.length === 0) return false;
  return A.some((x) => B.includes(x));
}

// ---------------------------------------------------------------------------
// localStorage overrides (client-only; server calls are no-ops)
// ---------------------------------------------------------------------------

export const OVERRIDE_KEY = "pokopia:overrides";

/** User edits applied on top of the shipped dataset — id → partial patch. */
export type PokemonOverride = Partial<Omit<Pokemon, "id">>;
export type OverrideMap = Record<number, PokemonOverride>;

export function loadOverrides(): OverrideMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(OVERRIDE_KEY);
    return raw ? (JSON.parse(raw) as OverrideMap) : {};
  } catch {
    return {};
  }
}

export function saveOverrides(overrides: OverrideMap): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides));
}

export function clearOverrides(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(OVERRIDE_KEY);
}

export function applyOverrides(
  pokemon: readonly Pokemon[],
  overrides: OverrideMap,
): Pokemon[] {
  return pokemon.map((p) => {
    const patch = overrides[p.id];
    return patch ? ({ ...p, ...patch } as Pokemon) : p;
  });
}

/** Produce a full pokedex JSON reflecting localStorage overrides. */
export function exportPokedexJson(overrides: OverrideMap): string {
  const merged: PokedexData = {
    ...DATA,
    generated_at: new Date().toISOString().slice(0, 10),
    pokemon: applyOverrides(ALL_POKEMON, overrides),
  };
  return JSON.stringify(merged, null, 2);
}
