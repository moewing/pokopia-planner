import type { EnvAxis, Environment, Pokemon } from "@/types/pokemon";
import { ENV_TO_AXIS } from "@/types/pokemon";

/**
 * Terrace / single-map planner.
 *
 * Replaces the earlier "spread across 5 maps" idea: the early-game player
 * actually works inside ONE map at a time, arranging 1–3 adjacent 4×4 cells.
 * Each cell can stack up to one value per env axis (明暗 + 冷暖 + 燥湿), so
 * pokemon whose envs live on different axes can share a cell.
 *
 * This planner:
 *   1. Chooses cell env configurations that collectively house every pokemon.
 *   2. Assigns pokemon to cells, preferring cells where *all* their peers are
 *      compatible (so housing is unambiguous).
 *   3. For a terrace with N cells, returns per-zone item recommendations:
 *      - private zone of each cell
 *      - overlap zone between cell i and cell i+1
 *      …optimizing for "fewest items cover the most pokemon".
 */

export const CELL_CAPACITY = 6;
export const MAX_CELLS_PER_TERRACE = 3; // ≥3 adjacent cells: middle becomes shared overlap

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CellEnvConfig = Partial<Record<"bright-dim" | "warm-cool" | "dry-humid", Environment>>;

export interface CellLayout {
  id: string; // "c0", "c1", "c2"
  index: number; // 0-based position in the terrace
  envs: Environment[]; // envs actually enabled (up to 3, one per axis)
  pokemon: Pokemon[];
}

export type ZoneKind = "private" | "overlap";

export interface ItemSuggestion {
  item: string;
  /** How many of this terrace's pokemon like this item */
  covers: number;
  /** Which cell indices the zone actually reaches (for visualization) */
  reaches: number[];
}

export interface Zone {
  id: string; // e.g. "p0" for private(cell0), "o0-1" for overlap(cell0-cell1)
  kind: ZoneKind;
  /** Cells whose 12×12 comfort range covers this zone. */
  coveredCells: number[];
  /** Pokemon living in any `coveredCells` — they all benefit from items placed here. */
  beneficiaries: Pokemon[];
  /** Ranked suggested items (not yet assigned to other zones). */
  suggestions: ItemSuggestion[];
}

/** Why a pokemon couldn't be housed in this terrace. */
export type UnhousedReason =
  | "env_conflict" // pokemon's env axis is occupied by the opposite value — no cell can accept them
  | "cell_full"; // a compatible cell exists but is full; we're at MAX_CELLS so can't overflow

export interface UnhousedRecord {
  pokemon: Pokemon;
  reason: UnhousedReason;
  /** For env_conflict: which env(s) on the same axis are currently occupying cells. */
  conflictingEnvs?: Environment[];
  /** What this pokemon likes — useful when deciding to build a second terrace. */
  likes: string[];
  /** Efficiency score at the time of assignment (lower = less desirable to keep). */
  efficiencyScore: number;
}

export interface TerraceLayout {
  cells: CellLayout[];
  zones: Zone[];
  unhoused: UnhousedRecord[];
  warnings: string[];
  stats: {
    pokemon: number;
    envsRepresented: number;
    likesCovered: number; // total (pokemon × items) preference satisfactions
    avgLikeSatisfaction: number; // 0..1
  };
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

/**
 * Plan a single-map terrace for the given pokemon.
 *
 * Constraints:
 *   - cells are non-empty; we never emit an empty cell
 *   - cell count ≤ MAX_CELLS_PER_TERRACE (3)
 *   - each cell holds ≤ CELL_CAPACITY (6) pokemon
 *
 * If the input can't fit under those constraints, excess pokemon go into
 * `unhoused` and a warning is emitted.
 */
export function planTerrace(selected: readonly Pokemon[]): TerraceLayout {
  const warnings: string[] = [];
  const pool = selected.filter((p) => p.is_playable && p.env !== null);
  const dropped = selected.length - pool.length;
  if (dropped > 0)
    warnings.push(`忽略了 ${dropped} 只不可入住或无环境宝可梦`);

  if (pool.length === 0) {
    return {
      cells: [],
      zones: [],
      unhoused: [],
      warnings,
      stats: {
        pokemon: 0,
        envsRepresented: 0,
        likesCovered: 0,
        avgLikeSatisfaction: 0,
      },
    };
  }

  // ---- 1. Bucket pokemon by env ------------------------------------------
  const envBuckets = new Map<Environment, Pokemon[]>();
  for (const p of pool) {
    const e = p.env as Environment;
    if (!envBuckets.has(e)) envBuckets.set(e, []);
    envBuckets.get(e)!.push(p);
  }

  // Sort envs by size desc (most popular env drives cell sizing)
  const sortedEnvs = [...envBuckets.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );
  const envsRepresented = sortedEnvs.length;

  // ---- 2a. Sort pool by efficiency (shared-likes with others desc) so the
  //         most "broadly-useful" pokemon get priority if space is tight.
  const efficiencyScore = new Map<number, number>();
  for (const p of pool) {
    let shared = 0;
    for (const l of p.likes) {
      for (const q of pool) {
        if (q.id === p.id) continue;
        if (q.likes.includes(l)) {
          shared += 1;
          break;
        }
      }
    }
    efficiencyScore.set(p.id, shared);
  }
  const sortedPool = [...pool].sort((a, b) => {
    const sa = efficiencyScore.get(a.id) ?? 0;
    const sb = efficiencyScore.get(b.id) ?? 0;
    if (sb !== sa) return sb - sa;
    return a.id - b.id; // stable tie-break
  });

  // ---- 2b. Figure out cell layout ----------------------------------------
  // Strategy: the most-populated env becomes the shared env across all cells
  // (it goes in every cell because its pokemon must be hosted somewhere).
  // Each OTHER env (on a non-conflicting axis with shared) gets its own cell,
  // stacked with the shared env.
  // Same-axis conflicts force separate cells (and zero stacking on that axis
  // for a cell, so the conflicting env gets a dedicated cell on its own).

  const sharedEnv = sortedEnvs[0]?.[0] ?? null;
  const sharedAxis = sharedEnv ? ENV_TO_AXIS[sharedEnv] : null;

  // Collect env configs for cells.
  // A "slot" is one cell. We add envs one at a time trying to stack non-conflicting
  // ones on the shared cell; conflicts create new cells.
  type Slot = { envs: Set<Environment>; axes: Set<string> };
  const slots: Slot[] = [];
  if (sharedEnv) {
    slots.push({ envs: new Set([sharedEnv]), axes: new Set([sharedAxis!]) });
  }

  for (const [env, _bucket] of sortedEnvs) {
    if (env === sharedEnv) continue;
    const ax = ENV_TO_AXIS[env];
    // Try to stack onto an existing slot (non-conflicting axes)
    let placed = false;
    for (const s of slots) {
      if (!s.axes.has(ax)) {
        s.envs.add(env);
        s.axes.add(ax);
        placed = true;
        break;
      }
    }
    if (!placed) {
      slots.push({ envs: new Set([env]), axes: new Set([ax]) });
    }
  }

  // Too many slots? Cap at MAX_CELLS_PER_TERRACE. Extra pokemon go unhoused.
  // (This is rare: 6 envs ÷ 3 axes = max 3 slots under full stacking, but
  // if we pushed fallback cells it may exceed.)
  const clippedSlots = slots.slice(0, MAX_CELLS_PER_TERRACE);
  const droppedSlots = slots.slice(MAX_CELLS_PER_TERRACE);
  const droppedEnvs = new Set<Environment>();
  for (const s of droppedSlots) for (const e of s.envs) droppedEnvs.add(e);

  // ---- 3. Assign pokemon to cells ---------------------------------------
  const cells: CellLayout[] = clippedSlots.map((s, idx) => ({
    id: `c${idx}`,
    index: idx,
    envs: [...s.envs],
    pokemon: [],
  }));

  // Precompute axis → envs currently configured across slots (for conflict reporting)
  const axisOccupants: Record<EnvAxis, Environment[]> = {
    "bright-dim": [],
    "warm-cool": [],
    "dry-humid": [],
  };
  for (const c of clippedSlots) {
    for (const e of c.envs) {
      axisOccupants[ENV_TO_AXIS[e]].push(e);
    }
  }

  const unhoused: UnhousedRecord[] = [];
  for (const p of sortedPool) {
    const e = p.env as Environment;
    const score = efficiencyScore.get(p.id) ?? 0;

    if (droppedEnvs.has(e)) {
      const ax = ENV_TO_AXIS[e];
      const conflicting = axisOccupants[ax].filter((x) => x !== e);
      unhoused.push({
        pokemon: p,
        reason: "env_conflict",
        conflictingEnvs: conflicting,
        likes: p.likes,
        efficiencyScore: score,
      });
      continue;
    }
    // Find the slot whose env set contains this pokemon's env and has room
    let targetIdx = cells.findIndex(
      (c) => c.envs.includes(e) && c.pokemon.length < CELL_CAPACITY,
    );
    if (targetIdx === -1) {
      // Try spinning up an overflow cell if we're under MAX_CELLS_PER_TERRACE.
      if (cells.length < MAX_CELLS_PER_TERRACE) {
        const primary = cells.find((c) => c.envs.includes(e));
        const overflowEnvs = primary ? [...primary.envs] : [e];
        cells.push({
          id: `c${cells.length}`,
          index: cells.length,
          envs: overflowEnvs,
          pokemon: [],
        });
        for (const ee of overflowEnvs) axisOccupants[ENV_TO_AXIS[ee]].push(ee);
        targetIdx = cells.length - 1;
      } else {
        unhoused.push({
          pokemon: p,
          reason: "cell_full",
          likes: p.likes,
          efficiencyScore: score,
        });
        continue;
      }
    }
    cells[targetIdx].pokemon.push(p);
  }

  const conflictCount = unhoused.filter((u) => u.reason === "env_conflict").length;
  const fullCount = unhoused.filter((u) => u.reason === "cell_full").length;
  if (conflictCount > 0) {
    warnings.push(
      `${conflictCount} 只宝可梦的环境与现有居住地互斥 —— 建议另建一个 terrace`,
    );
  }
  if (fullCount > 0) {
    warnings.push(
      `${fullCount} 只宝可梦排在效率队尾未能入住 —— 可以考虑减少同 env 宝可梦或再建一个 terrace`,
    );
  }

  // Keep only non-empty cells (shouldn't happen normally but guard)
  const activeCells = cells.filter((c) => c.pokemon.length > 0);

  // Renumber
  activeCells.forEach((c, i) => {
    c.id = `c${i}`;
    c.index = i;
  });

  // ---- 4. Compute zones & item suggestions ------------------------------
  const zones = buildZones(activeCells);

  // ---- 5. Stats ----------------------------------------------------------
  const totalPokemon = activeCells.reduce((n, c) => n + c.pokemon.length, 0);
  const { likesCovered, avgLikeSatisfaction } = scoreLayout(activeCells, zones);

  return {
    cells: activeCells,
    zones,
    unhoused,
    warnings,
    stats: {
      pokemon: totalPokemon,
      envsRepresented,
      likesCovered,
      avgLikeSatisfaction,
    },
  };
}

// ---------------------------------------------------------------------------
// Zone construction + item picking
// ---------------------------------------------------------------------------

/**
 * For a 3-cell row, zones are:
 *   private(0): only cell 0's comfort range sees it
 *   overlap(0-1): cells 0 & 1 both see it
 *   private(1): only cell 1 (middle cell's exclusive zone is small in-game, but we keep it)
 *   overlap(1-2): cells 1 & 2 both see it
 *   private(2): only cell 2
 *
 * Pokemon benefit from items placed in any zone their cell's comfort range reaches.
 *
 * Item picking strategy (efficiency-max): greedy, from biggest-coverage zone
 * to smallest, always pick the item with the largest marginal coverage among
 * the zone's beneficiaries who haven't yet had that like satisfied. This keeps
 * high-frequency likes in overlap zones (reused) and frees private zones for
 * niche preferences.
 */
function buildZones(cells: CellLayout[]): Zone[] {
  if (cells.length === 0) return [];

  const zones: Zone[] = [];
  // Emit in order: p0, o0-1, p1, o1-2, p2 so the UI lays them left-to-right.
  for (let i = 0; i < cells.length; i++) {
    zones.push(makeZone("private", [i], cells));
    if (i < cells.length - 1) {
      zones.push(makeZone("overlap", [i, i + 1], cells));
    }
  }

  // ---- Item assignment (greedy, efficiency-max) --------------------------
  // Each pokemon tracks likes that have been satisfied by items already placed.
  const satisfied = new Map<number, Set<string>>();
  for (const c of cells)
    for (const p of c.pokemon) satisfied.set(p.id, new Set());

  // Order zones by descending efficiency: overlaps (coverage ≥ 2) first, then privates.
  // Inside each tier sort by number of beneficiaries desc (more people = more efficient).
  const ordered = [...zones].sort((a, b) => {
    const kindRank = a.kind === "overlap" && b.kind !== "overlap" ? -1 : a.kind !== "overlap" && b.kind === "overlap" ? 1 : 0;
    if (kindRank !== 0) return kindRank;
    return b.beneficiaries.length - a.beneficiaries.length;
  });

  const ITEMS_PER_ZONE = 8;

  for (const zone of ordered) {
    const picks: ItemSuggestion[] = [];
    while (picks.length < ITEMS_PER_ZONE) {
      // Tally marginal coverage: item → how many beneficiaries would newly satisfy a like
      const tally = new Map<string, number>();
      for (const p of zone.beneficiaries) {
        const sat = satisfied.get(p.id)!;
        for (const l of p.likes) {
          if (sat.has(l)) continue;
          tally.set(l, (tally.get(l) ?? 0) + 1);
        }
      }
      if (tally.size === 0) break;

      const sorted = [...tally.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      );
      const [item, count] = sorted[0];
      if (count === 0) break;

      picks.push({
        item,
        covers: count,
        reaches: zone.coveredCells,
      });
      // Mark satisfaction
      for (const p of zone.beneficiaries) {
        if (p.likes.includes(item)) satisfied.get(p.id)!.add(item);
      }
    }
    zone.suggestions = picks;
  }

  return zones;
}

function makeZone(
  kind: ZoneKind,
  coveredCells: number[],
  cells: CellLayout[],
): Zone {
  const beneficiaries: Pokemon[] = [];
  for (const idx of coveredCells) beneficiaries.push(...cells[idx].pokemon);
  const id =
    kind === "private"
      ? `p${coveredCells[0]}`
      : `o${coveredCells[0]}-${coveredCells[1]}`;
  return {
    id,
    kind,
    coveredCells,
    beneficiaries,
    suggestions: [],
  };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function scoreLayout(
  cells: CellLayout[],
  zones: Zone[],
): { likesCovered: number; avgLikeSatisfaction: number } {
  // For each pokemon: which items from zones covering its cell are in its likes?
  let totalCovered = 0;
  let totalLikes = 0;
  for (const c of cells) {
    const reachableItems = new Set<string>();
    for (const z of zones) {
      if (z.coveredCells.includes(c.index))
        for (const sug of z.suggestions) reachableItems.add(sug.item);
    }
    for (const p of c.pokemon) {
      const likedAndReachable = p.likes.filter((l) => reachableItems.has(l)).length;
      totalCovered += likedAndReachable;
      totalLikes += Math.max(1, p.likes.length);
    }
  }
  return {
    likesCovered: totalCovered,
    avgLikeSatisfaction: totalLikes === 0 ? 0 : totalCovered / totalLikes,
  };
}
