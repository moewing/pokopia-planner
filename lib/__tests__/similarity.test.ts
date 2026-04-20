import { describe, expect, it } from "vitest";

import { getPokemonById, getPlayable } from "../data";
import {
  commonOverlap,
  groupByAffinity,
  similarity,
  similarityMatrix,
} from "../similarity";
import { ENV_TO_AXIS, type Environment } from "@/types/pokemon";

const byId = (id: number) => {
  const p = getPokemonById(id);
  if (!p) throw new Error(`fixture pokemon #${id} missing`);
  return p;
};

describe("similarity — locked rules", () => {
  it("non-playable pair returns null (百变怪 / 神兽不参与)", () => {
    expect(similarity(byId(47), byId(1))).toBeNull();
    expect(similarity(byId(1), byId(299))).toBeNull();
    expect(similarity(byId(299), byId(300))).toBeNull();
  });

  it("same pokemon compared to itself returns 100", () => {
    const mew = byId(1); // 妙蛙种子
    expect(similarity(mew, mew)).toBe(100);
  });

  it("same-axis opposite envs (温暖 vs 凉爽) are hard-cut to 0", () => {
    const warm = getPlayable().find((p) => p.env === "温暖")!;
    const cool = getPlayable().find((p) => p.env === "凉爽")!;
    expect(similarity(warm, cool)).toBe(0);
  });

  it("明亮 vs 昏暗 are hard-cut to 0 (same bright-dim axis, opposite)", () => {
    const bright = getPlayable().find((p) => p.env === "明亮")!;
    const dim = getPlayable().find((p) => p.env === "昏暗")!;
    expect(similarity(bright, dim)).toBe(0);
  });

  it("cross-axis envs (温暖 vs 潮湿) can coexist → score ≥ 15 base", () => {
    const warm = getPlayable().find((p) => p.env === "温暖")!;
    const humid = getPlayable().find((p) => p.env === "潮湿")!;
    const s = similarity(warm, humid);
    expect(s).not.toBeNull();
    expect(s!).toBeGreaterThanOrEqual(15);
  });

  it("same env, no overlap, no taste match → exactly 40 (env base only)", () => {
    const p1 = {
      ...byId(1),
      id: -1,
      taste: "甜" as const,
      likes: ["x-unique-1"],
    };
    const p2 = {
      ...byId(1),
      id: -2,
      taste: "辣" as const,
      likes: ["x-unique-2"],
    };
    expect(similarity(p1, p2)).toBe(40);
  });

  it("cross-axis envs, no overlap, no taste match → exactly 15 (cross-axis base)", () => {
    // Mock warm + humid pokemon with no other matches
    const warm = { ...byId(4), id: -1, env: "温暖" as const, taste: "甜" as const, likes: ["x-1"] };
    const humid = { ...byId(7), id: -2, env: "潮湿" as const, taste: "辣" as const, likes: ["x-2"] };
    expect(similarity(warm, humid)).toBe(15);
  });

  it("same env + taste + identical likes → 100", () => {
    const p1 = { ...byId(1), id: -1, taste: "甜" as const, likes: ["a", "b"] };
    const p2 = { ...byId(1), id: -2, taste: "甜" as const, likes: ["a", "b"] };
    expect(similarity(p1, p2)).toBe(100);
  });
});

describe("similarityMatrix", () => {
  it("returns a symmetric square with 100 on the diagonal", () => {
    const sample = getPlayable().slice(0, 5);
    const m = similarityMatrix(sample);
    expect(m.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      expect(m[i].length).toBe(5);
      expect(m[i][i]).toBe(100);
      for (let j = 0; j < 5; j++) {
        expect(m[i][j]).toBe(m[j][i]);
      }
    }
  });
});

describe("groupByAffinity", () => {
  it("分组内 envs 都能共存（跨轴可叠加；同轴相反不能）", () => {
    const sample = getPlayable().slice(0, 40);
    const groups = groupByAffinity(sample, 6);
    for (const g of groups) {
      const envs = [...new Set(g.map((p) => p.env))].filter(Boolean) as Environment[];
      for (let i = 0; i < envs.length; i++) {
        for (let j = i + 1; j < envs.length; j++) {
          // Same axis different value would be a hard conflict
          if (envs[i] !== envs[j]) {
            expect(ENV_TO_AXIS[envs[i]]).not.toBe(ENV_TO_AXIS[envs[j]]);
          }
        }
      }
    }
  });

  it("每组不超过 groupSize", () => {
    const sample = getPlayable().slice(0, 40);
    const groups = groupByAffinity(sample, 4);
    for (const g of groups) expect(g.length).toBeLessThanOrEqual(4);
  });

  it("非 playable 被剔除", () => {
    const sample = [byId(47), ...getPlayable().slice(0, 10)];
    const groups = groupByAffinity(sample, 6);
    expect(groups.flat().every((p) => p.is_playable)).toBe(true);
  });
});

describe("commonOverlap", () => {
  it("按出现频率降序", () => {
    const g = [
      { ...byId(1), likes: ["a", "b"] },
      { ...byId(2), likes: ["a", "c"] },
      { ...byId(3), likes: ["a", "d"] },
    ];
    const overlap = commonOverlap(g as never);
    expect(overlap.likes[0].item).toBe("a");
    expect(overlap.likes[0].count).toBe(3);
    expect(overlap.likes[0].coverage).toBe(1);
  });

  it("聚合 tastes 和 envs", () => {
    const g = [byId(1), byId(2), byId(4)];
    const overlap = commonOverlap(g);
    expect(overlap.envs.length).toBeGreaterThan(0);
    expect(overlap.tastes.length).toBeGreaterThan(0);
  });
});
