# 🌸 Pokopia Planner

> A cozy planning companion for Pokémon Pokopia — find, filter, and match your Pokémon to build cozy, cycle-efficient habitats.

**[🔗 Live Demo](https://pokopia-planner.vercel.app)** · **[📖 中文说明](#中文说明)**

<!-- Add a screenshot to docs/screenshot.png and uncomment below once deployed. -->
<!-- ![Screenshot](./docs/screenshot.png) -->

---

## ✨ Features

- **📖 Pokédex** — Browse all 300 Pokémon with rich filters by environment, specialty, taste, and likes
- **⚙️ Resource Cycles** — Auto-recommend Pokémon teams for the 3 crafting loops (Wood / Brick / Iron Bar) + one-off paper processing
- **🏡 Early-Stage Planner** — Three modes:
  - **Single-map terrace** (default): stack envs across 3 axes (bright-dim / warm-cool / dry-humid), optimize item placement in overlap zones
  - **Multi-map distribution**: split Pokémon across 5 maps (25 each) for dedicated resource cycles
  - **Manual**: click-to-assign with real-time env/cycle warnings
- **💝 Late-Stage Planner** — Pairwise similarity matrix (same-axis opposites = 0, cross-axis = 15 base) with auto-grouping and shared item suggestions
- **✏️ Data Editor** — Fix any data locally (localStorage) and export updated JSON; edits flow live into every other module

## 🎮 About the Game

[Pokémon Pokopia](https://www.pokemon.com/us/pokemon-video-games/pokemon-pokopia) is a life-simulation spin-off for Nintendo Switch 2 where you play as a Ditto transformed into a human, helping Pokémon build habitats on a peaceful island.

This tool helps you:

- Quickly look up Pokémon preferences without opening a dozen wiki tabs
- Plan efficient resource-cycle teams before committing to a habitat build
- Figure out which Pokémon make good roommates for cozy endgame homes
- Work out the *exact* item layout that maximises comfort across a terrace's shared zones

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 (CSS-first) + shadcn/ui (base-nova style)
- **State**: Zustand (with `persist` middleware)
- **Drag & Drop**: `@dnd-kit`
- **Testing**: Vitest (58 unit tests)
- **Deployment**: Vercel

## 🚀 Local Development

```bash
# Clone
git clone https://github.com/moewing/pokopia-planner.git
cd pokopia-planner

# Install (Node ≥ 20; uses pnpm via corepack)
corepack enable
pnpm install

# Dev server
pnpm dev           # → http://localhost:3000

# Other scripts
pnpm test          # vitest
pnpm typecheck     # tsc --noEmit
pnpm build         # production build
pnpm lint
```

## 📊 Data

The Pokémon data in `/data/pokemon.json` is compiled from:

- Player-curated specialty tables (community PDFs)
- [kkplay3c.net](https://kkplay3c.net) — taste and likes data
- [pokopiamap.com](https://pokopiamap.com) — official in-game art and English specialty names
- [pokopiahabitats.com](https://pokopiahabitats.com) — specialty mechanics reference
- `scripts/scrape_pokopiamap.ts` fills `type / time_of_day / weather / habitats` for all 300 Pokémon
- In-game verification by the maintainer

Found a data error? You can fix it in the `/edit` page and export the corrected JSON, or open an issue.

## 📁 Project Structure

```
pokopia-planner/
├── app/                    # Next.js App Router pages
│   ├── pokedex/
│   ├── recipes/
│   ├── planner/
│   │   ├── early/          # 3 tabs: terrace / multi-map / manual
│   │   └── late/
│   └── edit/
├── components/             # PokemonCard, PokemonDetail, SiteNav, ThemeToggle…
├── components/ui/          # shadcn/ui primitives (don't hand-edit; use the CLI)
├── lib/                    # Core logic
│   ├── data.ts             #   dataset + overrides
│   ├── cycles.ts           #   resource-cycle role detection
│   ├── similarity.ts       #   axis-aware similarity (same-axis opposite → 0)
│   ├── terrace.ts          #   single-map terrace planner (primary)
│   └── planner.ts          #   legacy 5-map distributor
├── store/                  # Zustand stores (planner / manual-plan / overrides)
├── types/pokemon.ts        # Canonical domain types + env-axis mappings
├── data/pokemon.json       # Main data source (300 Pokémon, schema v0.2)
└── scripts/
    └── scrape_pokopiamap.ts  # Fill extension fields from pokopiamap.com
```

## 🙏 Acknowledgments

Huge thanks to the Pokopia community:

- Players who compiled and shared specialty tables
- [kkplay3c.net](https://kkplay3c.net) for the comprehensive preference database
- [pokopiamap.com](https://pokopiamap.com) and [pokopiahabitats.com](https://pokopiahabitats.com) for the thorough game wikis
- Everyone who plays this cozy little game 💛

## ⚠️ Disclaimer

This is an **unofficial fan-made tool** for the game Pokémon Pokopia.

Pokémon and all related names, images, and characters are trademarks of **Nintendo / Creatures Inc. / GAME FREAK inc. / The Pokémon Company**. This project is **not affiliated with, endorsed, or sponsored** by any of them.

Pokémon icons are loaded from public CDNs ([pokopiamap.com](https://pokopiamap.com) and [PokeAPI](https://pokeapi.co)) and are **not hosted in this repository**.

If you are a rights holder and have concerns about this project, please open an issue and I'll respond promptly.

## 📄 License

Code in this repository is licensed under the [MIT License](./LICENSE).

Pokémon data, names, and imagery are not covered by this license and remain property of their respective rights holders.

---

## 中文说明

**Pokopia 居住地规划助手** —— 任天堂 Switch 2 游戏《宝可梦 Pokopia》的非官方同人工具。

### ✨ 功能

- 📖 **图鉴**：300 只宝可梦完整信息，按环境 / 特长 / 口味 / 喜好事物多维筛选
- ⚙️ **资源循环**：木材 / 红砖 / 铁条 三条循环 + 废纸一次性加工，一键推荐最小完整队伍
- 🏡 **前期规划器**（三种模式）：
  - **单地图精算**（默认）：按明暗 / 冷暖 / 燥湿 3 条环境轴在格子里叠加，重叠区物品效率最大化
  - **多地图分配**：5 张地图 × 25 只上限，每张主承载一条资源循环
  - **手动调整**：点击分配宝可梦到格子，实时显示环境冲突和循环完整性
- 💝 **后期规划器**：两两相似度矩阵 + 自动分组 + 共同布置清单
- ✏️ **数据纠错**：发现数据错误随时修改（localStorage），改动在全站即时生效，支持导出完整 JSON

### 🎮 关于游戏

[《宝可梦 Pokopia》](https://www.pokemon.com/us/pokemon-video-games/pokemon-pokopia) 是任天堂 Switch 2 平台的生活模拟类宝可梦衍生作品。玩家扮演被百变怪变身的人类，在平和的小岛上帮宝可梦们搭建舒适的居住地。

### 🛠️ 技术栈

Next.js 16 + React 19 + TypeScript · Tailwind CSS v4 + shadcn/ui · Zustand · @dnd-kit · Vitest · Vercel

### 🚀 本地运行

```bash
git clone https://github.com/moewing/pokopia-planner.git
cd pokopia-planner
corepack enable
pnpm install
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。

### 🙏 贡献

欢迎提 Issue 反馈数据错误或新功能建议！如果你在游戏里验证了某只宝可梦的数据和本工具不一致，请告诉我 🙏

### ⚠️ 免责声明

本项目是非官方、由粉丝制作的工具，仅供个人学习与《Pokopia》玩家交流使用，未获得任何商业授权或官方合作关系。

- 项目与 Nintendo、The Pokémon Company、Creatures Inc.、Game Freak、以及《Pokopia》开发发行方**无任何关联**，也未经其认可、审核或授权。
- 所有宝可梦相关的名称、形象、图标、游戏机制术语均为各自权利人所有。项目中展示的宝可梦图片通过外链引用自 `pokopiamap.com` 与 `PokeAPI` GitHub CDN，版权归原权利人所有。
- 数据由玩家社区多个来源整理合并，可能存在错误或与游戏实际表现不一致。使用本项目作出的任何规划决策均为玩家自身判断，项目作者不对游戏内效果负责。

如 Nintendo / The Pokémon Company / Game Freak 或任何权利人认为本项目侵犯了权益，请通过 GitHub issue 联系。
