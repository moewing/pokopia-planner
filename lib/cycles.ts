import type { CycleId, Pokemon } from "@/types/pokemon";

/**
 * Cycle roles — finer-grained than raw specialties because 乱撒 depends on
 * which item is being littered, and 点火 / 回收利用 serve more than one cycle.
 *
 * A single pokemon may fill multiple roles (e.g. 双斧战龙 #73 is both
 * litter_wood and process_wood; 灰尘山 #133 is litter_iron and process_recycle).
 */
export type CycleRole =
  | "litter_wood"
  | "litter_brick"
  | "litter_iron"
  | "gather"
  | "process_wood" // 伐木
  | "process_brick" // 点火 → 黏土→红砖
  | "process_iron" // 点火 → 铁→铁条
  | "process_recycle"; // 回收利用 → 不可燃垃圾→铁

export type OneShotRole = "process_paper"; // 回收利用 + 玩家投的废纸

export interface RoleSet {
  cycle: Set<CycleRole>;
  oneShot: Set<OneShotRole>;
}

export function rolesFor(p: Pokemon): RoleSet {
  const cycle = new Set<CycleRole>();
  const oneShot = new Set<OneShotRole>();
  const specs = new Set(p.specialties);
  const items = new Set(p.littered_items);

  if (specs.has("乱撒")) {
    if (items.has("小圆木")) cycle.add("litter_wood");
    if (items.has("软塌塌黏土")) cycle.add("litter_brick");
    if (items.has("不可燃垃圾")) cycle.add("litter_iron");
  }
  if (specs.has("分类")) cycle.add("gather");
  if (specs.has("伐木")) cycle.add("process_wood");
  if (specs.has("点火")) {
    cycle.add("process_brick");
    cycle.add("process_iron");
  }
  if (specs.has("回收利用")) {
    cycle.add("process_recycle");
    oneShot.add("process_paper");
  }

  return { cycle, oneShot };
}

export const CYCLE_REQUIREMENTS: Record<CycleId, CycleRole[]> = {
  wood_cycle: ["litter_wood", "gather", "process_wood"],
  brick_cycle: ["litter_brick", "gather", "process_brick"],
  iron_bar_cycle: [
    "litter_iron",
    "gather",
    "process_recycle",
    "process_iron",
  ],
};

export const CYCLE_META: Record<
  CycleId,
  { name: string; outputs: string[]; accent: string }
> = {
  wood_cycle: {
    name: "木材循环",
    outputs: ["小圆木 → 木材"],
    accent: "bg-pkp-peach text-pkp-peach-ink",
  },
  brick_cycle: {
    name: "红砖循环",
    outputs: ["软塌塌黏土 → 红砖"],
    accent: "bg-pkp-pink text-pkp-pink-ink",
  },
  iron_bar_cycle: {
    name: "铁条循环",
    outputs: ["不可燃垃圾 → 铁 → 铁条"],
    accent: "bg-pkp-sky text-pkp-sky-ink",
  },
};

export interface CycleAnalysis {
  complete: boolean;
  missingRoles: CycleRole[];
  staffing: Record<CycleRole, Pokemon[]>;
}

export interface OneShotAnalysis {
  doable: boolean;
  processors: Pokemon[];
}

export interface CycleReport {
  wood_cycle: CycleAnalysis;
  brick_cycle: CycleAnalysis;
  iron_bar_cycle: CycleAnalysis;
  paper: OneShotAnalysis;
}

/**
 * For a candidate pool of pokemon, report which cycles could complete and
 * which roles are missing. Non-playable pokemon are filtered silently.
 */
export function analyzeCycles(pool: readonly Pokemon[]): CycleReport {
  const eligible = pool.filter((p) => p.is_playable);

  const analyzeOne = (cycleId: CycleId): CycleAnalysis => {
    const staffing = Object.fromEntries(
      CYCLE_REQUIREMENTS[cycleId].map((r) => [r, [] as Pokemon[]]),
    ) as Record<CycleRole, Pokemon[]>;

    for (const p of eligible) {
      const { cycle } = rolesFor(p);
      for (const role of CYCLE_REQUIREMENTS[cycleId]) {
        if (cycle.has(role)) staffing[role].push(p);
      }
    }
    const missingRoles = CYCLE_REQUIREMENTS[cycleId].filter(
      (r) => staffing[r].length === 0,
    );
    return { complete: missingRoles.length === 0, missingRoles, staffing };
  };

  const processors: Pokemon[] = [];
  for (const p of eligible) {
    if (rolesFor(p).oneShot.has("process_paper")) processors.push(p);
  }

  return {
    wood_cycle: analyzeOne("wood_cycle"),
    brick_cycle: analyzeOne("brick_cycle"),
    iron_bar_cycle: analyzeOne("iron_bar_cycle"),
    paper: { doable: processors.length > 0, processors },
  };
}

/**
 * Pick a minimal team that completes the given cycle, favoring env-consistent
 * members and stable selection (smallest id breaks ties).
 * Returns null if the pool can't complete the cycle.
 */
export function recommendCycleTeam(
  cycleId: CycleId,
  pool: readonly Pokemon[],
): Pokemon[] | null {
  const report = analyzeCycles(pool);
  const c = report[cycleId];
  if (!c.complete) return null;

  const envTally = new Map<string, number>();
  for (const role of CYCLE_REQUIREMENTS[cycleId]) {
    for (const p of c.staffing[role]) {
      if (p.env) envTally.set(p.env, (envTally.get(p.env) ?? 0) + 1);
    }
  }
  const majorityEnv =
    [...envTally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const team: Pokemon[] = [];
  const picked = new Set<number>();

  for (const role of CYCLE_REQUIREMENTS[cycleId]) {
    const alreadyCovered = team.some((p) => rolesFor(p).cycle.has(role));
    if (alreadyCovered) continue;

    const candidates = c.staffing[role].filter((p) => !picked.has(p.id));
    if (candidates.length === 0) return null; // should not happen if complete

    candidates.sort((a, b) => {
      const aMatch = a.env === majorityEnv ? 0 : 1;
      const bMatch = b.env === majorityEnv ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return a.id - b.id;
    });
    team.push(candidates[0]);
    picked.add(candidates[0].id);
  }
  return team;
}

/**
 * Returns the env distribution inside a cycle team — useful so the UI can
 * suggest placing the team on a single map with multiple environment cells.
 */
export function teamEnvDistribution(team: Pokemon[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const p of team) {
    if (!p.env) continue;
    dist[p.env] = (dist[p.env] ?? 0) + 1;
  }
  return dist;
}
