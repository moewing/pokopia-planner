import { describe, expect, it } from "vitest";

import {
  ALL_POKEMON,
  CONSTANTS,
  bySpecialty,
  byEnv,
  byTaste,
  byLike,
  getAllPokemon,
  getPlayable,
  getPokemonById,
  search,
  tasteToArray,
  tastesOverlap,
} from "../data";

describe("data.ts — dataset integrity", () => {
  it("loads 300 pokemon with stable ids", () => {
    expect(ALL_POKEMON.length).toBe(300);
    const ids = ALL_POKEMON.map((p) => p.id);
    expect(new Set(ids).size).toBe(300);
    expect(Math.min(...ids)).toBe(1);
    expect(Math.max(...ids)).toBe(300);
  });

  it("constants expose canonical enumerations", () => {
    expect(CONSTANTS.environments).toHaveLength(6);
    expect(CONSTANTS.tastes).toHaveLength(5);
    expect(CONSTANTS.non_playable_ids).toHaveLength(13);
    expect(CONSTANTS.game_mechanics.total_maps).toBe(5);
    expect(CONSTANTS.game_mechanics.max_pokemon_per_map).toBe(25);
    expect(CONSTANTS.game_mechanics.pokemon_per_cell).toBe(6);
  });

  it("separates playable from non_playable cleanly", () => {
    const playable = getPlayable();
    expect(playable.length).toBe(287);
    const nonPlayableIds = new Set(CONSTANTS.non_playable_ids);
    for (const p of ALL_POKEMON) {
      expect(p.is_playable).toBe(!nonPlayableIds.has(p.id));
    }
    expect(getPokemonById(47)?.is_playable).toBe(false); // 百变怪
    expect(getPokemonById(299)?.is_playable).toBe(false); // 超梦
  });
});

describe("data.ts — lookups", () => {
  it("getPokemonById resolves known rows", () => {
    expect(getPokemonById(1)?.name).toBe("妙蛙种子");
    expect(getPokemonById(47)?.name).toBe("百变怪");
    expect(getPokemonById(9999)).toBeUndefined();
  });

  it("bySpecialty returns all pokemon with that specialty", () => {
    const luan = bySpecialty("乱撒");
    expect(luan.length).toBeGreaterThan(3);
    expect(luan.every((p) => p.specialties.includes("乱撒"))).toBe(true);
  });

  it("byEnv filters including null (for 百变怪)", () => {
    const humid = byEnv("潮湿");
    expect(humid.length).toBeGreaterThan(10);
    expect(humid.every((p) => p.env === "潮湿")).toBe(true);
    const envless = byEnv(null);
    expect(envless.every((p) => p.env === null)).toBe(true);
    expect(envless.some((p) => p.id === 47)).toBe(true);
  });

  it("byTaste matches string and array tastes", () => {
    const sweet = byTaste("甜");
    expect(sweet.length).toBeGreaterThan(10);
    // #59 无壳海兔 has taste = ['酸','涩'] — both filters hit it
    const sour = byTaste("酸");
    const astr = byTaste("涩");
    expect(sour.some((p) => p.id === 59)).toBe(true);
    expect(astr.some((p) => p.id === 59)).toBe(true);
  });

  it("byLike returns pokemon liking that tag", () => {
    const water = byLike("感受水");
    expect(water.length).toBeGreaterThan(5);
    expect(water.every((p) => p.likes.includes("感受水"))).toBe(true);
  });

  it("search handles numeric ids, names, and english specialties", () => {
    expect(search("1")[0]?.id).toBe(1);
    expect(search("妙蛙").some((p) => p.id === 1)).toBe(true);
    expect(search("Litter").every((p) => p.specialties.includes("乱撒"))).toBe(
      true,
    );
    expect(search("")).toEqual([]);
  });
});

describe("data.ts — taste helpers", () => {
  it("tasteToArray normalizes string, array, and null", () => {
    expect(tasteToArray("甜")).toEqual(["甜"]);
    expect(tasteToArray(["酸", "涩"])).toEqual(["酸", "涩"]);
    expect(tasteToArray(null)).toEqual([]);
  });

  it("tastesOverlap returns true iff any shared taste", () => {
    expect(tastesOverlap("甜", "甜")).toBe(true);
    expect(tastesOverlap("甜", "辣")).toBe(false);
    expect(tastesOverlap(["酸", "涩"], "酸")).toBe(true);
    expect(tastesOverlap(["酸", "涩"], ["辣", "涩"])).toBe(true);
    expect(tastesOverlap(null, "甜")).toBe(false);
  });
});

describe("data.ts — immutability of getAllPokemon", () => {
  it("returns a fresh array (caller cannot mutate internal state)", () => {
    const a = getAllPokemon();
    const b = getAllPokemon();
    expect(a).not.toBe(b);
    a.pop();
    expect(b.length).toBe(300);
  });
});
