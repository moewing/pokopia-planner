import type { Environment, Pokemon } from "@/types/pokemon";
import { ENV_TO_AXIS } from "@/types/pokemon";
import { tastesOverlap } from "./data";

const ENV_SAME_POINTS = 40;
const ENV_CROSS_AXIS_POINTS = 15;
const TASTE_MATCH_POINTS = 20;
const LIKES_MAX_POINTS = 40;

/**
 * Similarity in [0, 100]; null if either pokemon is not playable.
 *
 * Env rule (user-pinned 2026-04-19, second revision):
 *   - Envs live on 3 opposing axes (明暗 / 冷暖 / 燥湿). Same-axis-different-value
 *     means the two can never share a cell physically → return 0.
 *   - Same env → +40.
 *   - Different envs on different axes → they CAN share a stacked cell
 *     (e.g. "明亮 + 温暖 + 潮湿"), so we don't zero them out; instead we award a
 *     modest +15 base and let taste / likes drive the rest.
 */
export function similarity(a: Pokemon, b: Pokemon): number | null {
  if (!a.is_playable || !b.is_playable) return null;
  if (a.env === null || b.env === null) return null;

  const axA = ENV_TO_AXIS[a.env as Environment];
  const axB = ENV_TO_AXIS[b.env as Environment];

  let score: number;
  if (a.env === b.env) {
    score = ENV_SAME_POINTS;
  } else if (axA === axB) {
    // Same axis, different values → mutually exclusive, cannot coexist.
    return 0;
  } else {
    score = ENV_CROSS_AXIS_POINTS;
  }

  if (tastesOverlap(a.taste, b.taste)) score += TASTE_MATCH_POINTS;

  const aLikes = new Set(a.likes);
  const bLikes = new Set(b.likes);
  if (aLikes.size > 0 || bLikes.size > 0) {
    let intersect = 0;
    for (const x of aLikes) if (bLikes.has(x)) intersect += 1;
    const union = aLikes.size + bLikes.size - intersect;
    if (union > 0) score += (intersect / union) * LIKES_MAX_POINTS;
  }

  return Math.min(100, Math.round(score));
}

/** n×n square; diagonal is 100 (self-similarity), off-diagonal uses `similarity`. */
export function similarityMatrix(list: Pokemon[]): Array<Array<number | null>> {
  return list.map((a, i) =>
    list.map((b, j) => (i === j ? 100 : similarity(a, b))),
  );
}

/**
 * Group pokemon whose envs can coexist (same env OR different axis). Greedy:
 * seed by highest total similarity, then grow by farthest-from-worst. Groups
 * respect physical constraints — two pokemon with opposite same-axis envs
 * (e.g. 温暖 + 凉爽) will never end up in the same group because similarity
 * returns 0 for them.
 */
export function groupByAffinity(
  list: Pokemon[],
  groupSize = 6,
): Pokemon[][] {
  const pool = list.filter((p) => p.is_playable && p.env !== null);
  const groups: Pokemon[][] = [];
  const remaining = [...pool];

  while (remaining.length > 0) {
    // Seed: highest sum of similarity to others
    let seedIdx = 0;
    if (remaining.length > 1) {
      let bestScore = -1;
      for (let i = 0; i < remaining.length; i++) {
        let sum = 0;
        for (let j = 0; j < remaining.length; j++) {
          if (i === j) continue;
          sum += similarity(remaining[i], remaining[j]) ?? 0;
        }
        if (sum > bestScore) {
          bestScore = sum;
          seedIdx = i;
        }
      }
    }
    const group = [remaining.splice(seedIdx, 1)[0]];

    while (group.length < groupSize && remaining.length > 0) {
      let bestIdx = -1;
      let bestMin = -Infinity;
      for (let i = 0; i < remaining.length; i++) {
        // Reject immediately if axis-conflict with anyone in the current group
        const hasConflict = group.some((g) => similarity(g, remaining[i]) === 0);
        if (hasConflict) continue;
        let minSim = Infinity;
        for (const g of group) {
          const s = similarity(g, remaining[i]) ?? 0;
          if (s < minSim) minSim = s;
        }
        if (minSim > bestMin) {
          bestMin = minSim;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break; // nothing compatible left
      group.push(remaining.splice(bestIdx, 1)[0]);
    }
    groups.push(group);
  }
  return groups;
}

export interface GroupOverlap {
  likes: Array<{ item: string; count: number; coverage: number }>;
  tastes: string[];
  envs: string[];
}

/** Co-occurrence counts for a group — drives the "共同布置清单" panel. */
export function commonOverlap(group: Pokemon[]): GroupOverlap {
  const likeCount = new Map<string, number>();
  for (const p of group) {
    for (const l of p.likes) likeCount.set(l, (likeCount.get(l) ?? 0) + 1);
  }
  const likes = [...likeCount.entries()]
    .map(([item, count]) => ({
      item,
      count,
      coverage: count / Math.max(1, group.length),
    }))
    .sort((a, b) => b.count - a.count || a.item.localeCompare(b.item));

  const tastes = new Set<string>();
  for (const p of group) {
    const ts = Array.isArray(p.taste)
      ? p.taste
      : p.taste
        ? [p.taste]
        : [];
    for (const t of ts) tastes.add(t);
  }

  const envs = new Set<string>();
  for (const p of group) if (p.env) envs.add(p.env);

  return { likes, tastes: [...tastes], envs: [...envs] };
}
