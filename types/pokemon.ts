/**
 * Canonical domain types for Pokopia Planner.
 *
 * The shape mirrors `/data/pokemon.json` (schema_version 0.2). Enumerations
 * (`Environment`, `Taste`, `Specialty`) come straight from `constants` in the
 * data file — keep them in sync if the data schema ever changes.
 */

// --- Enumerations -----------------------------------------------------------

export const ENVIRONMENTS = [
  "明亮",
  "温暖",
  "潮湿",
  "干燥",
  "昏暗",
  "凉爽",
] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

/**
 * 3 opposing env axes (user-pinned 2026-04-19 round 2).
 * Within one axis the two values are mutually exclusive; across axes they stack.
 * Example: a cell can be set to 明亮 + 温暖 + 潮湿 simultaneously.
 */
export const ENV_AXES = ["bright-dim", "warm-cool", "dry-humid"] as const;
export type EnvAxis = (typeof ENV_AXES)[number];

export const ENV_TO_AXIS: Record<Environment, EnvAxis> = {
  明亮: "bright-dim",
  昏暗: "bright-dim",
  温暖: "warm-cool",
  凉爽: "warm-cool",
  潮湿: "dry-humid",
  干燥: "dry-humid",
};

export const ENV_OPPOSITE: Record<Environment, Environment> = {
  明亮: "昏暗",
  昏暗: "明亮",
  温暖: "凉爽",
  凉爽: "温暖",
  潮湿: "干燥",
  干燥: "潮湿",
};

/** Returns true if two envs can physically coexist (different axes, or same value). */
export function envsCompatible(a: Environment, b: Environment): boolean {
  if (a === b) return true;
  return ENV_TO_AXIS[a] !== ENV_TO_AXIS[b];
}

export const AXIS_LABEL: Record<EnvAxis, string> = {
  "bright-dim": "明暗",
  "warm-cool": "冷暖",
  "dry-humid": "燥湿",
};

/**
 * 5 in-game map names (official Pokopia). Users see these in the planner UI.
 */
export const MAP_NAMES = [
  "干巴巴荒野的城镇",
  "暗沉沉海边的城镇",
  "凸隆隆山地的城镇",
  "亮晶晶空岛的城镇",
  "空空镇",
] as const;
export type MapName = (typeof MAP_NAMES)[number];

export const TASTES = ["甜", "酸", "辣", "苦", "涩"] as const;
export type Taste = (typeof TASTES)[number];

/** All 32 in-game specialties (PDF 中文名). */
export const SPECIALTIES = [
  "栽培",
  "乱撒",
  "点火",
  "伐木",
  "滋润",
  "交易",
  "飞翔",
  "找东西",
  "分类",
  "回收利用",
  "建造",
  "碾压",
  "重踏",
  "瞬间移动",
  "带动气氛",
  "发电",
  "收纳",
  "变身",
  "鉴定",
  "彩绘",
  "DJ",
  "工匠",
  "梦岛",
  "贪吃鬼",
  "哈欠",
  "开派对",
  "爆炸",
  "收藏家",
  "采蜜",
  "稀有物",
  "不明",
  "发光",
] as const;
export type Specialty = (typeof SPECIALTIES)[number];

/** Specialty roles in the resource cycles. */
export type CycleId = "wood_cycle" | "brick_cycle" | "iron_bar_cycle";
export type OneShotId = "paper";
export type SpecialtyRole = "litter" | "gather" | "processor";

// --- Core domain ------------------------------------------------------------

export interface Pokemon {
  id: number;
  /** 简体中文名（主） */
  name: string;
  /** 繁体中文名，可空 */
  name_tw: string | null;
  /** Pokopia CDN 图标 URL */
  icon_url: string;
  /** 备用（PokeAPI）图标 URL — 主图 onError 时切换 */
  icon_url_fallback: string;
  /** 是否可入住居住地（百变怪与神兽为 false） */
  is_playable: boolean;
  /** 中文特长列表 */
  specialties: string[];
  /** 英文特长列表 */
  specialties_en: string[];
  /** 乱撒物：仅当 specialties 含"乱撒"时非空 */
  littered_items: string[];
  /** 喜欢环境（6 选 1）。百变怪为 null */
  env: Environment | null;
  /** 喜欢口味（5 选 1）。偶尔是列表，通常是字符串 */
  taste: Taste | Taste[] | null;
  /** 喜欢事物标签（Jaccard 相似度的核心维度） */
  likes: string[];
  /** 属性（草/毒...）— 待 scraper 补 */
  type: string[] | null;
  /** 时段（白天/夜晚...）— 待补 */
  time_of_day: string[] | null;
  /** 天气 — 待补 */
  weather: string[] | null;
  /** 推荐栖息地名（图鉴阶段1发现用）— 待补 */
  habitats: string[];
  /** 调试/纠偏备注 */
  notes: string[];
}

// --- Constants block inside pokemon.json ------------------------------------

export interface ResourceCycle {
  name_cn: string;
  pattern: string[];
  outputs: string[];
}

export interface OneShotProcessing {
  name_cn: string;
  source: string;
  processor: string;
}

export interface GameMechanics {
  total_maps: number;
  max_pokemon_per_map: number;
  over_limit_behavior: string;
  min_cell_size: string;
  pokemon_per_cell: number;
  comfort_zone_range: string;
  cells_2_adjacent_size: string;
  cells_3_adjacent_size: string;
  cells_3_overlap_zone: string;
  cells_3_shared_pokemon: number;
  env_scope: "per_cell";
  env_scope_explain: string;
}

export interface SpecialtyRoleMeta {
  role: SpecialtyRole;
  desc: string;
  cycles?: CycleId[];
  one_shots?: OneShotId[];
}

export interface DataConstants {
  environments: Environment[];
  tastes: Taste[];
  specialty_cn_to_en: Record<string, string>;
  resource_cycles: Record<CycleId, ResourceCycle>;
  one_shot_processing: Record<OneShotId, OneShotProcessing>;
  specialty_roles: Record<string, SpecialtyRoleMeta>;
  game_mechanics: GameMechanics;
  non_playable_ids: number[];
}

/** Top-level schema of `/data/pokemon.json`. */
export interface PokedexData {
  schema_version: string;
  generated_at: string;
  source_notes: string;
  constants: DataConstants;
  pokemon: Pokemon[];
}

// --- UI helpers -------------------------------------------------------------

/** Emoji used consistently across badges, filters, cards. */
export const ENVIRONMENT_EMOJI: Record<Environment, string> = {
  明亮: "🌞",
  温暖: "🔥",
  潮湿: "💧",
  干燥: "🏜️",
  昏暗: "🌙",
  凉爽: "❄️",
};

/** Tailwind utility class names (background + text ink) per environment. */
export const ENVIRONMENT_CLASSES: Record<
  Environment,
  { bg: string; text: string; border: string }
> = {
  明亮: {
    bg: "bg-pkp-yellow",
    text: "text-pkp-yellow-ink",
    border: "border-pkp-yellow-ink/15",
  },
  温暖: {
    bg: "bg-pkp-peach",
    text: "text-pkp-peach-ink",
    border: "border-pkp-peach-ink/15",
  },
  潮湿: {
    bg: "bg-pkp-mint",
    text: "text-pkp-mint-ink",
    border: "border-pkp-mint-ink/15",
  },
  干燥: {
    bg: "bg-pkp-sand",
    text: "text-pkp-sand-ink",
    border: "border-pkp-sand-ink/15",
  },
  昏暗: {
    bg: "bg-pkp-lavender",
    text: "text-pkp-lavender-ink",
    border: "border-pkp-lavender-ink/15",
  },
  凉爽: {
    bg: "bg-pkp-sky",
    text: "text-pkp-sky-ink",
    border: "border-pkp-sky-ink/15",
  },
};

export const TASTE_EMOJI: Record<Taste, string> = {
  甜: "🍓",
  酸: "🍋",
  辣: "🌶️",
  苦: "🌿",
  涩: "🍵",
};
