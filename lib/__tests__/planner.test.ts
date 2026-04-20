import { describe, expect, it } from "vitest";

import { getPlayable, getPokemonById } from "../data";
import { MAX_MAPS, MAX_PER_MAP, planEarlyMode } from "../planner";

const byId = (id: number) => {
  const p = getPokemonById(id);
  if (!p) throw new Error(`fixture pokemon #${id} missing`);
  return p;
};

describe("planner — planEarlyMode", () => {
  it("empty input yields 5 empty maps", () => {
    const plan = planEarlyMode([]);
    expect(plan.maps).toHaveLength(MAX_MAPS);
    for (const m of plan.maps) expect(m.pokemon.length).toBe(0);
    expect(plan.metrics.totalAssigned).toBe(0);
    expect(plan.metrics.cyclesComplete).toBe(0);
  });

  it("filters non-playable silently (records warning)", () => {
    const plan = planEarlyMode([byId(47) /* 百变怪 */, byId(1)]);
    expect(plan.metrics.totalAssigned).toBe(1);
    expect(plan.warnings.join(" ")).toMatch(/不可入住/);
  });

  it("small curated team fills a single cycle map", () => {
    const team = [byId(73), byId(62)]; // 双斧战龙 (wood litter+process), 随风球 (gather)
    const plan = planEarlyMode(team);
    const woodMap = plan.maps[0];
    expect(woodMap.pokemon.length).toBeGreaterThan(0);
    expect(woodMap.cycleReport.wood_cycle.complete).toBe(true);
    expect(plan.metrics.cyclesComplete).toBeGreaterThanOrEqual(1);
  });

  it("全 playable 池（287 只）分配到 5 张地图，每张 ≤25，cycles 完整", () => {
    const plan = planEarlyMode(getPlayable());
    expect(plan.maps).toHaveLength(5);
    for (const m of plan.maps) {
      expect(m.pokemon.length).toBeLessThanOrEqual(MAX_PER_MAP);
    }
    expect(plan.metrics.totalAssigned).toBe(MAX_MAPS * MAX_PER_MAP);
    // At least wood + brick + iron should complete with the full pool
    expect(plan.metrics.cyclesComplete).toBeGreaterThanOrEqual(3);
    // Orphans when > 125
    expect(plan.orphans.length).toBe(getPlayable().length - 125);
  });

  it("每张地图的 cells 中,一个 cell 的 env 里的 pokemon 都喜欢该 env", () => {
    const plan = planEarlyMode(getPlayable().slice(0, 60));
    for (const m of plan.maps)
      for (const t of m.terraces)
        for (const c of t.cells)
          for (const p of c.pokemon) expect(p.env).toBe(c.env);
  });

  it("terrace.overlapItems 只收录被 ≥2 只共同喜欢的物品", () => {
    const plan = planEarlyMode(getPlayable().slice(0, 30));
    for (const m of plan.maps)
      for (const t of m.terraces)
        for (const o of t.overlapItems) expect(o.count).toBeGreaterThanOrEqual(2);
  });

  it("avgComfort 总在 [0,100]", () => {
    const plan = planEarlyMode(getPlayable().slice(0, 40));
    expect(plan.metrics.avgComfort).toBeGreaterThanOrEqual(0);
    expect(plan.metrics.avgComfort).toBeLessThanOrEqual(100);
  });
});
