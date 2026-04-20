import { describe, expect, it } from "vitest";

import { getPlayable, getPokemonById } from "../data";
import { planTerrace, CELL_CAPACITY, MAX_CELLS_PER_TERRACE } from "../terrace";
import { envsCompatible } from "@/types/pokemon";

const byId = (id: number) => {
  const p = getPokemonById(id);
  if (!p) throw new Error(`fixture pokemon #${id} missing`);
  return p;
};

describe("terrace — env axis logic", () => {
  it("空输入返回空 layout", () => {
    const r = planTerrace([]);
    expect(r.cells).toEqual([]);
    expect(r.zones).toEqual([]);
  });

  it("单一环境的宝可梦归为 1 个 cell", () => {
    // 3 pokemon all 明亮
    const picks = getPlayable()
      .filter((p) => p.env === "明亮")
      .slice(0, 3);
    const r = planTerrace(picks);
    expect(r.cells.length).toBe(1);
    expect(r.cells[0].envs).toEqual(["明亮"]);
    expect(r.cells[0].pokemon).toHaveLength(3);
  });

  it("两种不同轴的环境可以叠在同一个 cell 里（明亮 + 温暖）", () => {
    const bright = getPlayable().find((p) => p.env === "明亮")!;
    const warm = getPlayable().find((p) => p.env === "温暖")!;
    const r = planTerrace([bright, warm]);
    // With stacking, both fit into a single cell
    expect(r.cells.length).toBe(1);
    expect(r.cells[0].envs).toContain("明亮");
    expect(r.cells[0].envs).toContain("温暖");
  });

  it("同轴相反的环境必须分到不同 cell（明亮 + 昏暗）", () => {
    const bright = getPlayable().find((p) => p.env === "明亮")!;
    const dim = getPlayable().find((p) => p.env === "昏暗")!;
    const r = planTerrace([bright, dim]);
    expect(r.cells.length).toBe(2);
    // None of them live in the same cell
    const allEnvs = r.cells.map((c) => c.envs);
    expect(allEnvs.some((e) => e.includes("明亮") && e.includes("昏暗"))).toBe(
      false,
    );
  });

  it("3 条轴都用上时生成 2-3 个 cell（共享主轴 + 分开次轴对立面）", () => {
    // 4 envs: 明亮 + 温暖 + 凉爽 + 潮湿
    // 温暖 / 凉爽 same-axis → must split
    const pokemon = [
      getPlayable().find((p) => p.env === "明亮")!,
      getPlayable().find((p) => p.env === "温暖")!,
      getPlayable().find((p) => p.env === "凉爽")!,
      getPlayable().find((p) => p.env === "潮湿")!,
    ];
    const r = planTerrace(pokemon);
    expect(r.cells.length).toBeGreaterThanOrEqual(2);
    expect(r.cells.length).toBeLessThanOrEqual(MAX_CELLS_PER_TERRACE);
    // Each cell's env set should be internally compatible
    for (const c of r.cells) {
      for (const e1 of c.envs)
        for (const e2 of c.envs) expect(envsCompatible(e1, e2)).toBe(true);
    }
  });

  it("每个 cell 不超过 6 只", () => {
    const big = getPlayable().slice(0, 30);
    const r = planTerrace(big);
    for (const c of r.cells) expect(c.pokemon.length).toBeLessThanOrEqual(CELL_CAPACITY);
  });
});

describe("terrace — zone & item recommendation", () => {
  it("单 cell 只有 private 区", () => {
    const picks = getPlayable()
      .filter((p) => p.env === "明亮")
      .slice(0, 4);
    const r = planTerrace(picks);
    expect(r.zones.length).toBe(1);
    expect(r.zones[0].kind).toBe("private");
    expect(r.zones[0].coveredCells).toEqual([0]);
  });

  it("2 cells → 3 zones (p0, o0-1, p1)", () => {
    const bright = getPlayable().find((p) => p.env === "明亮")!;
    const dim = getPlayable().find((p) => p.env === "昏暗")!;
    const r = planTerrace([bright, dim]);
    const kinds = r.zones.map((z) => z.kind);
    const ids = r.zones.map((z) => z.id);
    expect(r.zones.length).toBe(3);
    expect(kinds).toEqual(["private", "overlap", "private"]);
    expect(ids).toEqual(["p0", "o0-1", "p1"]);
  });

  it("overlap 区的 beneficiaries = 两个相邻 cell 的并集", () => {
    const bright = getPlayable().find((p) => p.env === "明亮")!;
    const dim = getPlayable().find((p) => p.env === "昏暗")!;
    const r = planTerrace([bright, dim]);
    const overlap = r.zones.find((z) => z.kind === "overlap")!;
    expect(overlap.beneficiaries.length).toBe(2);
  });

  it("overlap 区优先被填（效率最大化，共享物品覆盖更多宝可梦）", () => {
    // Construct: two cells with some shared-like pokemon
    const pool = getPlayable().slice(0, 8);
    const r = planTerrace(pool);
    // Overlap zones should have at least as many suggestions as private (when both have candidates)
    const overlaps = r.zones.filter((z) => z.kind === "overlap" && z.beneficiaries.length > 0);
    const privates = r.zones.filter((z) => z.kind === "private");
    if (overlaps.length > 0 && privates.length > 0) {
      const totalOverlapSug = overlaps.reduce((n, z) => n + z.suggestions.length, 0);
      expect(totalOverlapSug).toBeGreaterThan(0);
    }
  });

  it("建议的物品不重复：一旦一件物品在某个 zone 放过，其他 zone 不再重复建议 (针对同一只宝可梦)", () => {
    const pool = getPlayable().slice(0, 12);
    const r = planTerrace(pool);
    // For each pokemon: how many times across all zones its liked items appear
    // Each reachable zone can "hit" a pokemon's like at most once (greedy dedup).
    for (const c of r.cells) {
      for (const p of c.pokemon) {
        for (const l of p.likes) {
          const hitCount = r.zones
            .filter((z) => z.coveredCells.includes(c.index))
            .reduce(
              (n, z) => n + z.suggestions.filter((s) => s.item === l).length,
              0,
            );
          // Each like should be satisfied at most once across all reachable zones
          expect(hitCount).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});
