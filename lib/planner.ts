import type { CycleId, Environment, Pokemon } from "@/types/pokemon";
import { analyzeCycles, rolesFor, type CycleReport } from "./cycles";

// ---------------------------------------------------------------------------
// Constants (from constants.game_mechanics)
// ---------------------------------------------------------------------------

export const MAX_MAPS = 5;
export const MAX_PER_MAP = 25;
export const PER_CELL = 6;

export const MAP_LABELS = ["A", "B", "C", "D", "E"] as const;

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface CellPlan {
  id: string;
  env: Environment;
  pokemon: Pokemon[];
}

export interface TerracePlan {
  id: string;
  cells: CellPlan[];
  overlapItems: Array<{ item: string; count: number; coverage: number }>;
  sharedPokemonCount: number;
}

export type MapTheme = CycleId | "mixed" | "empty";

export interface MapPlan {
  id: number; // 0..4
  label: string; // "地图 A"
  theme: MapTheme;
  pokemon: Pokemon[];
  terraces: TerracePlan[];
  cycleReport: CycleReport;
  warnings: string[];
}

export interface PlanMetrics {
  cyclesComplete: number; // 0..3 (wood + brick + iron)
  paperDoable: boolean;
  totalAssigned: number;
  totalCapacity: number; // MAX_MAPS * MAX_PER_MAP
  mapFillPct: number; // 0..1
  avgComfort: number; // 0..100
  mapsUsed: number;
}

export interface PlanResult {
  maps: MapPlan[];
  orphans: Pokemon[];
  metrics: PlanMetrics;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Core algorithm
// ---------------------------------------------------------------------------

/**
 * Plan-early algorithm (vibe-code pragmatic):
 *   1. Filter out non-playable (百变怪 / 神兽 never living with you).
 *   2. Trim at total cap (MAX_MAPS × MAX_PER_MAP = 125). Excess → orphans.
 *   3. Seed 3 cycle-themed maps (wood / brick / iron) with the roles needed.
 *      Greedily pack companions whose likes align to keep each map ≤25.
 *   4. Distribute leftover playable pokemon to the 2 remaining maps, clustered
 *      by env for nice cell groupings.
 *   5. For each non-empty map: bucket by env → chunks of PER_CELL = CellPlans;
 *      collect cells into terraces (one terrace per map for the MVP).
 *   6. Terrace overlap items = top-frequency likes across its pokemon.
 *   7. Metrics over the whole plan.
 */
export function planEarlyMode(selected: readonly Pokemon[]): PlanResult {
  const warnings: string[] = [];
  const playable = selected.filter((p) => p.is_playable);

  const dropped = selected.length - playable.length;
  if (dropped > 0) {
    warnings.push(
      `过滤掉 ${dropped} 只不可入住宝可梦（百变怪 / 神兽不参与规划）`,
    );
  }

  const capacity = MAX_MAPS * MAX_PER_MAP;
  let pool = [...playable];
  let orphans: Pokemon[] = [];
  if (pool.length > capacity) {
    orphans = pool.slice(capacity);
    pool = pool.slice(0, capacity);
    warnings.push(
      `选择总数 ${selected.length} 超过 5 张地图容量 ${capacity}，多余 ${orphans.length} 只被标为 orphans`,
    );
  }

  // Seed cycle maps: 0=wood, 1=brick, 2=iron.
  const mapBuckets: Pokemon[][] = [[], [], [], [], []];
  const assigned = new Set<number>();

  const CYCLES: CycleId[] = ["wood_cycle", "brick_cycle", "iron_bar_cycle"];
  const CORE_ROLES_BY_CYCLE: Record<CycleId, string[]> = {
    wood_cycle: ["litter_wood", "process_wood", "gather"],
    brick_cycle: ["litter_brick", "process_brick", "gather"],
    iron_bar_cycle: [
      "litter_iron",
      "process_recycle",
      "process_iron",
      "gather",
    ],
  };

  // Pass 1 — SEED each cycle map with its *essential* roles (one pokemon per role).
  // This matters because some specialties serve multiple cycles (e.g. 点火 is
  // both process_brick AND process_iron). Seeding one-per-role ensures brick
  // gets a 点火 AND iron gets a 点火 rather than brick eating them all.
  CYCLES.forEach((cycleId, mapIdx) => {
    const roles = CORE_ROLES_BY_CYCLE[cycleId].filter((r) => r !== "gather");
    for (const role of roles) {
      if (mapBuckets[mapIdx].length >= MAX_PER_MAP) break;
      const pick = pool.find(
        (p) => !assigned.has(p.id) && rolesFor(p).cycle.has(role as never),
      );
      if (pick) {
        mapBuckets[mapIdx].push(pick);
        assigned.add(pick.id);
      }
    }
  });

  // Pass 2 — seed one `gather` per cycle map.
  for (let mi = 0; mi < 3; mi++) {
    if (mapBuckets[mi].length >= MAX_PER_MAP) continue;
    const hasGather = mapBuckets[mi].some((x) =>
      rolesFor(x).cycle.has("gather"),
    );
    if (hasGather) continue;
    const g = pool.find(
      (p) => !assigned.has(p.id) && rolesFor(p).cycle.has("gather"),
    );
    if (g) {
      mapBuckets[mi].push(g);
      assigned.add(g.id);
    }
  }

  // Pass 2b — dump the rest of each cycle's same-role candidates into their map
  // (to prevent them from drifting to a free map and bloating it).
  CYCLES.forEach((cycleId, mapIdx) => {
    const ownRoles = new Set(CORE_ROLES_BY_CYCLE[cycleId]);
    // process_brick uniquely belongs to brick; process_iron / process_recycle
    // uniquely to iron; litter_wood / process_wood uniquely to wood; gather shared.
    for (const p of pool) {
      if (assigned.has(p.id)) continue;
      if (mapBuckets[mapIdx].length >= MAX_PER_MAP) break;
      const roles = rolesFor(p).cycle;
      let hitsOwn = false;
      for (const r of ownRoles) {
        if (r === "gather") continue; // gather shared across cycles; handled later
        if (roles.has(r as never)) {
          hitsOwn = true;
          break;
        }
      }
      if (hitsOwn) {
        mapBuckets[mapIdx].push(p);
        assigned.add(p.id);
      }
    }
  });

  // Pass 3: pack complementary pokemon into cycle maps via env-coherence.
  //   For each map, score remaining candidates by:
  //     +2 if same env as map's majority env
  //     +1 per shared like with any currently-assigned pokemon (cap 3)
  //   Greedily fill up to MAX_PER_MAP.
  const envMajorities: Record<number, Environment | null> = {};
  for (let mi = 0; mi < 3; mi++) envMajorities[mi] = majorityEnv(mapBuckets[mi]);

  for (let mi = 0; mi < 3; mi++) {
    while (mapBuckets[mi].length < MAX_PER_MAP) {
      const majEnv = envMajorities[mi];
      const currentLikes = new Set<string>();
      for (const p of mapBuckets[mi])
        for (const l of p.likes) currentLikes.add(l);

      const candidates = pool
        .filter((p) => !assigned.has(p.id))
        .map((p) => {
          let score = 0;
          if (majEnv && p.env === majEnv) score += 2;
          let overlap = 0;
          for (const l of p.likes) if (currentLikes.has(l)) overlap += 1;
          score += Math.min(3, overlap);
          return { p, score };
        })
        .sort((a, b) => b.score - a.score || a.p.id - b.p.id);

      if (candidates.length === 0 || candidates[0].score === 0) break;
      const pick = candidates[0].p;
      mapBuckets[mi].push(pick);
      assigned.add(pick.id);
    }
  }

  // Pass 4: remaining pool → maps 3, 4 (free maps). Cluster by env.
  const leftover = pool.filter((p) => !assigned.has(p.id));
  const byEnv = new Map<Environment, Pokemon[]>();
  for (const p of leftover) {
    if (!p.env) continue;
    const k = p.env;
    if (!byEnv.has(k)) byEnv.set(k, []);
    byEnv.get(k)!.push(p);
  }
  // Sort envs by bucket size desc
  const envsSorted = [...byEnv.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );
  // Fill map 3 first, then 4
  let cursor = 3;
  for (const [, group] of envsSorted) {
    for (const p of group) {
      while (cursor < MAX_MAPS && mapBuckets[cursor].length >= MAX_PER_MAP)
        cursor += 1;
      if (cursor >= MAX_MAPS) break;
      mapBuckets[cursor].push(p);
      assigned.add(p.id);
    }
  }
  // Anyone still unassigned (too many playable chosen)? → orphans
  for (const p of pool) {
    if (!assigned.has(p.id)) orphans.push(p);
  }

  // Build MapPlan for each bucket
  const maps: MapPlan[] = mapBuckets.map((bucket, mi) => {
    const cycleReport = analyzeCycles(bucket);
    let theme: MapTheme;
    if (bucket.length === 0) theme = "empty";
    else if (mi === 0 && cycleReport.wood_cycle.complete) theme = "wood_cycle";
    else if (mi === 1 && cycleReport.brick_cycle.complete) theme = "brick_cycle";
    else if (mi === 2 && cycleReport.iron_bar_cycle.complete)
      theme = "iron_bar_cycle";
    else theme = "mixed";

    // Cells: bucket by env, then chunk 6
    const envGroups = new Map<Environment, Pokemon[]>();
    for (const p of bucket) {
      if (!p.env) continue;
      if (!envGroups.has(p.env)) envGroups.set(p.env, []);
      envGroups.get(p.env)!.push(p);
    }

    const cells: CellPlan[] = [];
    let cellIdx = 0;
    for (const [env, group] of envGroups.entries()) {
      for (let i = 0; i < group.length; i += PER_CELL) {
        cells.push({
          id: `map${mi}-cell${cellIdx++}`,
          env,
          pokemon: group.slice(i, i + PER_CELL),
        });
      }
    }

    // Terrace: MVP = one terrace per map, all cells share likes overlap
    const terraces: TerracePlan[] = [];
    if (cells.length > 0) {
      const allPokemon = cells.flatMap((c) => c.pokemon);
      const likeCount = new Map<string, number>();
      for (const p of allPokemon)
        for (const l of p.likes)
          likeCount.set(l, (likeCount.get(l) ?? 0) + 1);
      const overlapItems = [...likeCount.entries()]
        .filter(([, c]) => c >= 2) // at least shared by 2
        .map(([item, count]) => ({
          item,
          count,
          coverage: count / allPokemon.length,
        }))
        .sort((a, b) => b.count - a.count || a.item.localeCompare(b.item))
        .slice(0, 10);
      terraces.push({
        id: `map${mi}-terrace0`,
        cells,
        overlapItems,
        sharedPokemonCount: allPokemon.length,
      });
    }

    // Warnings
    const warn: string[] = [];
    if (bucket.length > MAX_PER_MAP) {
      warn.push(`超过每图 25 只上限（${bucket.length}）`);
    }
    if (mi < 3 && theme === "mixed") {
      const cycleId = CYCLES[mi];
      const missing = cycleReport[cycleId].missingRoles;
      if (missing.length > 0) {
        warn.push(
          `缺少 ${CYCLES[mi].replace("_cycle", "").replace("iron_bar", "iron")} 循环的角色：${missing.join(" / ")}`,
        );
      }
    }

    return {
      id: mi,
      label: `地图 ${MAP_LABELS[mi]}`,
      theme,
      pokemon: bucket,
      terraces,
      cycleReport,
      warnings: warn,
    };
  });

  // Overall metrics
  const cyclesComplete = maps.reduce((acc, m) => {
    let n = 0;
    if (m.cycleReport.wood_cycle.complete) n += 1;
    if (m.cycleReport.brick_cycle.complete) n += 1;
    if (m.cycleReport.iron_bar_cycle.complete) n += 1;
    return acc + n;
  }, 0);
  const paperDoable = maps.some((m) => m.cycleReport.paper.doable);
  const totalAssigned = maps.reduce((a, m) => a + m.pokemon.length, 0);

  // Comfort: every assigned pokemon already lives in its env cell (we sorted that way),
  // so env match = 100%. Overlap bonus = average fraction of a pokemon's likes that
  // appear in its terrace overlap items.
  let comfortSum = 0;
  let comfortCount = 0;
  for (const m of maps) {
    for (const t of m.terraces) {
      const overlapSet = new Set(t.overlapItems.map((x) => x.item));
      for (const c of t.cells)
        for (const p of c.pokemon) {
          let base = 60; // env-matched baseline
          if (p.likes.length > 0) {
            let overlap = 0;
            for (const l of p.likes) if (overlapSet.has(l)) overlap += 1;
            base += (overlap / p.likes.length) * 40;
          } else {
            base += 20;
          }
          comfortSum += base;
          comfortCount += 1;
        }
    }
  }
  const avgComfort = comfortCount === 0 ? 0 : comfortSum / comfortCount;

  return {
    maps,
    orphans,
    warnings,
    metrics: {
      cyclesComplete,
      paperDoable,
      totalAssigned,
      totalCapacity: capacity,
      mapFillPct: totalAssigned / capacity,
      avgComfort: Math.round(avgComfort),
      mapsUsed: maps.filter((m) => m.pokemon.length > 0).length,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function majorityEnv(pokemon: readonly Pokemon[]): Environment | null {
  const tally = new Map<Environment, number>();
  for (const p of pokemon) {
    if (!p.env) continue;
    tally.set(p.env, (tally.get(p.env) ?? 0) + 1);
  }
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? null;
}
