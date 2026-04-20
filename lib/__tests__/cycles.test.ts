import { describe, expect, it } from "vitest";

import { getPokemonById, getPlayable } from "../data";
import {
  CYCLE_REQUIREMENTS,
  analyzeCycles,
  recommendCycleTeam,
  rolesFor,
  teamEnvDistribution,
} from "../cycles";

const byId = (id: number) => {
  const p = getPokemonById(id);
  if (!p) throw new Error(`fixture pokemon #${id} missing`);
  return p;
};

describe("cycles.ts — rolesFor", () => {
  it("双斧战龙 #73 covers both litter_wood and process_wood", () => {
    const roles = rolesFor(byId(73));
    expect(roles.cycle.has("litter_wood")).toBe(true);
    expect(roles.cycle.has("process_wood")).toBe(true);
  });

  it("乌波 #117 is a brick litterer (no processor)", () => {
    const roles = rolesFor(byId(117));
    expect(roles.cycle.has("litter_brick")).toBe(true);
    expect(roles.cycle.has("process_brick")).toBe(false);
  });

  it("小火龙 #4 lights fires for both brick and iron cycles", () => {
    const roles = rolesFor(byId(4));
    expect(roles.cycle.has("process_brick")).toBe(true);
    expect(roles.cycle.has("process_iron")).toBe(true);
    expect(roles.cycle.has("litter_iron")).toBe(false);
  });

  it("瓦斯弹 #38 recycles for iron and can process paper one-shots", () => {
    const roles = rolesFor(byId(38));
    expect(roles.cycle.has("process_recycle")).toBe(true);
    expect(roles.oneShot.has("process_paper")).toBe(true);
  });

  it("灰尘山 #133 is both litter_iron and process_recycle (double-duty)", () => {
    const roles = rolesFor(byId(133));
    expect(roles.cycle.has("litter_iron")).toBe(true);
    expect(roles.cycle.has("process_recycle")).toBe(true);
  });

  it("非循环乱撒物（石头/棉花/叶子等）不计入任何循环", () => {
    const playable = getPlayable();
    const stoneLitterer = playable.find(
      (p) =>
        p.specialties.includes("乱撒") &&
        p.littered_items.includes("石头") &&
        !p.littered_items.includes("小圆木") &&
        !p.littered_items.includes("软塌塌黏土") &&
        !p.littered_items.includes("不可燃垃圾"),
    );
    if (stoneLitterer) {
      const roles = rolesFor(stoneLitterer);
      expect(roles.cycle.has("litter_wood")).toBe(false);
      expect(roles.cycle.has("litter_brick")).toBe(false);
      expect(roles.cycle.has("litter_iron")).toBe(false);
    }
  });
});

describe("cycles.ts — analyzeCycles", () => {
  it("empty pool completes nothing", () => {
    const report = analyzeCycles([]);
    expect(report.wood_cycle.complete).toBe(false);
    expect(report.brick_cycle.complete).toBe(false);
    expect(report.iron_bar_cycle.complete).toBe(false);
    expect(report.paper.doable).toBe(false);
  });

  it("三只凑齐木材循环（乱撒木 + 分类 + 伐木）", () => {
    const pool = [byId(73) /* 乱撒+伐木 */, byId(62) /* 分类 */];
    const report = analyzeCycles(pool);
    expect(report.wood_cycle.complete).toBe(true);
    expect(report.brick_cycle.complete).toBe(false);
  });

  it("全池 287 只 playable，四条循环都 complete，paper 可做", () => {
    const report = analyzeCycles(getPlayable());
    expect(report.wood_cycle.complete).toBe(true);
    expect(report.brick_cycle.complete).toBe(true);
    expect(report.iron_bar_cycle.complete).toBe(true);
    expect(report.paper.doable).toBe(true);
    for (const c of [
      report.wood_cycle,
      report.brick_cycle,
      report.iron_bar_cycle,
    ]) {
      expect(c.missingRoles).toEqual([]);
    }
  });

  it("非 playable 宝可梦被默默过滤", () => {
    const ditto = byId(47);
    expect(ditto.is_playable).toBe(false);
    const report = analyzeCycles([ditto]);
    expect(report.wood_cycle.complete).toBe(false);
    expect(report.paper.doable).toBe(false);
  });
});

describe("cycles.ts — recommendCycleTeam", () => {
  it("从全池挑最小完整队伍（木材循环）", () => {
    const team = recommendCycleTeam("wood_cycle", getPlayable());
    expect(team).not.toBeNull();
    expect(team!.length).toBeGreaterThanOrEqual(2);
    const roles = team!.flatMap((p) => [...rolesFor(p).cycle]);
    for (const req of CYCLE_REQUIREMENTS.wood_cycle) {
      expect(roles.includes(req)).toBe(true);
    }
  });

  it("铁条循环需要 ≥3 只不同 role 的宝可梦", () => {
    const team = recommendCycleTeam("iron_bar_cycle", getPlayable());
    expect(team).not.toBeNull();
    const roles = new Set(team!.flatMap((p) => [...rolesFor(p).cycle]));
    for (const req of CYCLE_REQUIREMENTS.iron_bar_cycle) {
      expect(roles.has(req)).toBe(true);
    }
  });

  it("池子不够凑齐时返回 null", () => {
    const team = recommendCycleTeam("wood_cycle", [byId(1) /* 妙蛙种子 栽培 */]);
    expect(team).toBeNull();
  });
});

describe("cycles.ts — teamEnvDistribution", () => {
  it("统计环境分布", () => {
    const team = [byId(4) /* 温暖 */, byId(5) /* 温暖 */, byId(117) /* 潮湿 */];
    const dist = teamEnvDistribution(team);
    expect(dist["温暖"]).toBe(2);
    expect(dist["潮湿"]).toBe(1);
  });
});
