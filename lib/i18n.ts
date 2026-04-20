"use client";

import { useCallback } from "react";

import { useLocaleStore, type Locale } from "@/store/i18n-store";
import type { Environment, Taste } from "@/types/pokemon";

/**
 * Minimal i18n — a flat string table keyed by dotted paths.
 * We don't translate Pokémon names (they're identifiers) or free-text like
 * `likes` / `littered_items` tags (too many, data is Chinese-first).
 * We DO translate env / taste / specialty values into English where the
 * game already has an official translation.
 */

type MessageTree = { [key: string]: string | MessageTree };

// --- Dictionaries -----------------------------------------------------------

const zh = {
  nav: {
    home: "首页",
    pokedex: "图鉴",
    recipes: "循环",
    plannerEarly: "前期",
    plannerLate: "后期",
    feedback: "发现错误？",
    toggleDark: "切换到深色",
    toggleLight: "切换到浅色",
    toggleLang: "切换语言",
  },
  home: {
    tagline: "为宝可梦选一个宜居的角落",
    heroA: "把 300 只宝可梦,",
    heroB: "安放在对的地方。",
    description:
      "Pokopia 的居住地规划,需要同时顾及资源循环、地图上限、以及每只小家伙喜欢的环境与物品。这里把这些规则整理成图鉴、配方、规划器与编辑器,让搭建过程变成一件安静的乐事。",
    environments: "环境",
    modulesTitle: "五个模块",
    modulesSubtitle: "图鉴 · 循环 · 前期 · 后期 · 发现错误",
    enter: "进入",
    modules: {
      pokedex: { title: "图鉴", subtitle: "Pokédex", description: "300 只宝可梦的特长、环境、口味与喜好,支持多维筛选。" },
      recipes: { title: "资源循环", subtitle: "Recipes", description: "木材 / 红砖 / 铁条三条循环 + 废纸一次性加工,一键推荐组合。" },
      plannerEarly: { title: "前期规划器", subtitle: "Early-game", description: "单地图 terrace 精算:3 条环境轴叠加,重叠区物品效率最大化。" },
      plannerLate: { title: "后期规划器", subtitle: "Late-game", description: "相似度矩阵 + 自动分组,打造精致空间;跨轴环境可以混,同轴对立不行。" },
      feedback: { title: "发现错误？", subtitle: "Feedback", description: "觉得哪里数据不对?改了它,然后一键提交到 GitHub 给作者修正。" },
    },
    footerData: "数据 v0.2 · 300 只宝可梦 · 287 可入住 · 5 张地图 × 25 只上限",
  },
  env: {
    明亮: "明亮",
    昏暗: "昏暗",
    温暖: "温暖",
    凉爽: "凉爽",
    潮湿: "潮湿",
    干燥: "干燥",
  },
  taste: {
    甜: "甜",
    酸: "酸",
    辣: "辣",
    苦: "苦",
    涩: "涩",
  },
  common: {
    loading: "加载中…",
    none: "无",
    all: "全部",
    reset: "重置",
    clear: "清空",
    save: "保存",
    cancel: "取消",
    search: "搜索",
    filter: "筛选",
    selected: "已选",
    apply: "应用",
  },
} as const satisfies MessageTree;

const en = {
  nav: {
    home: "Home",
    pokedex: "Pokédex",
    recipes: "Recipes",
    plannerEarly: "Early",
    plannerLate: "Late",
    feedback: "Report issue",
    toggleDark: "Switch to dark",
    toggleLight: "Switch to light",
    toggleLang: "Switch language",
  },
  home: {
    tagline: "A cozy corner for every Pokémon",
    heroA: "Place 300 Pokémon",
    heroB: "in the habitats they'll love.",
    description:
      "Pokopia habitat planning means juggling resource loops, map caps, and each little creature's preferred environment & items — all at once. This tool bundles those rules into a Pokédex, a recipe book, planners, and an editor, so building your island becomes a quiet little joy.",
    environments: "Environments",
    modulesTitle: "Five modules",
    modulesSubtitle: "Pokédex · Recipes · Early · Late · Report",
    enter: "Enter",
    modules: {
      pokedex: { title: "Pokédex", subtitle: "Pokédex", description: "All 300 Pokémon with filters for environment, specialty, taste, and likes." },
      recipes: { title: "Resource cycles", subtitle: "Recipes", description: "Wood / Brick / Iron Bar loops + one-off paper processing. One-click team picks." },
      plannerEarly: { title: "Early-game planner", subtitle: "Early-game", description: "Single-map terrace layouts — stack environment axes, maximise overlap-zone item efficiency." },
      plannerLate: { title: "Late-game planner", subtitle: "Late-game", description: "Similarity matrix + auto-grouping for cozy roommate arrangements." },
      feedback: { title: "Report issue", subtitle: "Feedback", description: "Spotted incorrect data? Fix it in-browser, then open a pre-filled GitHub issue." },
    },
    footerData: "Data v0.2 · 300 Pokémon · 287 playable · 5 maps × 25 cap",
  },
  env: {
    明亮: "Bright",
    昏暗: "Dim",
    温暖: "Warm",
    凉爽: "Cool",
    潮湿: "Humid",
    干燥: "Dry",
  },
  taste: {
    甜: "Sweet",
    酸: "Sour",
    辣: "Spicy",
    苦: "Bitter",
    涩: "Astringent",
  },
  common: {
    loading: "Loading…",
    none: "None",
    all: "All",
    reset: "Reset",
    clear: "Clear",
    save: "Save",
    cancel: "Cancel",
    search: "Search",
    filter: "Filter",
    selected: "Selected",
    apply: "Apply",
  },
} as const satisfies MessageTree;

const DICT: Record<Locale, MessageTree> = { zh, en };

// --- Hook -------------------------------------------------------------------

function lookup(tree: MessageTree, path: string): string | undefined {
  const parts = path.split(".");
  let cur: string | MessageTree = tree;
  for (const p of parts) {
    if (typeof cur === "string") return undefined;
    cur = cur[p];
    if (cur === undefined) return undefined;
  }
  return typeof cur === "string" ? cur : undefined;
}

export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  const t = useCallback(
    (path: string, fallback?: string): string =>
      lookup(DICT[locale], path) ?? lookup(DICT.zh, path) ?? fallback ?? path,
    [locale],
  );
  return { locale, t, translateEnv: (e: Environment) => t(`env.${e}`, e), translateTaste: (t2: Taste) => t(`taste.${t2}`, t2) };
}
