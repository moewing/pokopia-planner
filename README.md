# Pokopia Planner

一个帮玩家规划《Pokopia》宝可梦居住地的网站：图鉴、资源循环、前/后期规划器、数据纠错。审美基调是"如果无印良品设计了宝可梦的官方应用" —— 奶油白底、低饱和 pastel、深森林绿 CTA、大圆角、慷慨留白。

## 功能一览

| 模块 | 路径 | 做什么 |
| --- | --- | --- |
| 首页 | `/` | 5 模块导航 + 设计总览 |
| 图鉴 | `/pokedex` | 300 只宝可梦可筛选可搜索 · 点卡片看详情（含"组循环伙伴"与"气味相投 Top 10"） |
| 资源循环 | `/recipes` | 木材 / 红砖 / 铁条三条循环 + 废纸一次性加工 · 一键推荐最小完整阵容 |
| 前期规划器 | `/planner/early` | 资源循环导向。选宝可梦 → 自动分 5 张地图（每张 ≤25）→ 按环境切 4×4 格子 → 重叠区物品推荐 |
| 后期规划器 | `/planner/late` | 相似度导向。挑 2–10 只 → 两两相似度矩阵 → 自动分组 + 共同布置清单 |
| 数据纠错 | `/edit` | 表格编辑任意字段 · 本地 localStorage 持久化 · 一键导出 JSON |

## 技术栈

- **框架**：Next.js 16 (App Router) + React 19 + TypeScript
- **样式**：Tailwind CSS v4（CSS-first，无 `tailwind.config.ts`，token 全在 [`app/globals.css`](app/globals.css)）
- **UI**：shadcn/ui（`base-nova` style，底层是 `@base-ui/react`，**不是** Radix）
- **状态**：Zustand（规划器选择）
- **图标**：Lucide
- **动画**：Framer Motion（克制使用）
- **测试**：Vitest（`pnpm test` 跑 44 条）
- **部署**：Vercel

## 开发启动

```bash
pnpm install
pnpm dev       # → http://localhost:3000

pnpm test      # 单元测试
pnpm typecheck # tsc --noEmit
pnpm build     # 产线构建
pnpm lint
```

Node 要求：≥ 20（用 Node 24 开发）。包管理器：pnpm（通过 `corepack enable` 启用即可）。

## 数据

[`data/pokemon.json`](data/pokemon.json) 是 schema v0.2 的权威来源，包含：
- 300 只宝可梦（287 可入住、13 不可入住）
- `constants` 块：6 环境 / 5 口味 / 32 特长 / 3 资源循环定义 / 地图机制常量 / 不可入住 ID

字段的含义、玩家实测纠偏、环境冲突修正记录见 [`data_notes.md`](data_notes.md) 与 [`AUDIT_REPORT.md`](AUDIT_REPORT.md)。

## 数据编辑流程

1. 在 `/edit` 页面点任意行的"编辑"，改完保存 —— 改动只写到浏览器的 localStorage，不动仓库里的 JSON。
2. 全站其他页面（图鉴 / 规划器 / 循环）会读取原始数据，暂不自动叠加 overrides（MVP 选择：保持"只读事实"）。
3. 要把编辑结果固化进仓库：点"导出 JSON"下载文件，替换 `data/pokemon.json` 后提交 PR。

## 扩展字段补全（可选）

当前数据里 `type` / `time_of_day` / `weather` / `habitats` 四个字段为空，要补齐：

```bash
pnpm tsx scripts/scrape_pokopiamap.ts
# 依赖 cheerio undici；脚本每 1.5s 请求一次，避免封禁
```

脚本会遍历 pokopiamap.com 每只宝可梦详情页抓取字段并回写 `data/pokemon.json`。详细说明见脚本头注释。

## 部署到 Vercel

推仓库到 GitHub / GitLab，在 [vercel.com](https://vercel.com) 导入项目即可自动识别 Next.js 16 + pnpm 并部署。没有环境变量依赖，开箱即用。

```bash
# 或者使用 Vercel CLI
pnpm dlx vercel
```

## 设计基调

详细的设计规则（配色、留白、字体、禁区）写在 [`CLAUDE.md`](CLAUDE.md) 里，给未来的协作者（无论 AI 还是人）。核心要点：

- 背景 `#FAFAF8`（奶油白），正文 `#2C2C2C`（近黑），CTA `#2F4B3F`（深森林绿）
- 点缀色是 7 色低饱和 pastel（`--pkp-*`），映射到 6 个环境 badge
- 卡片 `rounded-2xl/3xl`，只用 `shadow-sm/md`，不要 `shadow-lg`
- 中文 Noto Sans SC / 苹方，英文数字 Inter
- Lucide 图标线条细；emoji 只在环境标签点缀
- 不做 52poke / Bulbapedia 那种信息密集资料库

## 目录结构

```
app/                    # Next.js App Router
├── pokedex/            # 图鉴页
├── recipes/            # 循环配方页
├── planner/
│   ├── early/          # 前期规划器（资源循环导向）
│   └── late/           # 后期规划器（相似度导向）
├── edit/               # 数据纠错
├── layout.tsx          # 全站 shell（含 SiteNav）
└── globals.css         # 所有设计 token

components/             # 业务组件
├── ui/                 # shadcn/ui（别手改，用 shadcn CLI 追加）
├── pokemon-card.tsx    # 图鉴卡片
├── pokemon-detail.tsx  # 详情 Dialog
├── pokemon-icon.tsx    # 带 onError fallback 的图标
├── site-nav.tsx        # 顶栏
├── planner-selector.tsx # 通用选择器（两个规划器共用）
└── ...

lib/
├── data.ts             # 数据加载 + lookups + override 读写
├── cycles.ts           # 角色细分 + analyzeCycles + recommendCycleTeam
├── similarity.ts       # 相似度（不同环境硬切为 0）+ 分组 + 重叠
├── planner.ts          # 前期规划算法（5 maps × 25 + env 分格子）
└── __tests__/          # 44 条 vitest 单元测试

store/
└── planner-store.ts    # Zustand + persist（早 / 晚 两个独立实例）

types/
└── pokemon.ts          # 领域类型（Pokemon / DataConstants）+ UI 常量映射

data/
├── pokemon.json        # 权威数据（v0.2）
└── pokemon.csv         # 参考 CSV

scripts/
└── scrape_pokopiamap.ts # 扩展字段补全脚本（可选）
```

## 致谢

- 数据主要来源：用户提供的 PDF、kkplay3c.net、pokopiamap.com、pokopiahabitats.com
- 地图机制 / 空间布局 / 环境冲突修正来自玩家社区实测
- shadcn/ui 提供了与项目审美契合的基础组件
