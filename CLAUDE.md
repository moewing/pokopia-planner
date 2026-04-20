@AGENTS.md

# Pokopia Planner — 给未来的 Claude Code

## 项目是什么

一个帮玩家规划 Pokopia 宝可梦居住地的网站：图鉴 + 资源循环 + 前/后期规划器 + 数据纠错。完整需求见 [CLAUDE_CODE_PROMPT.md](./CLAUDE_CODE_PROMPT.md)，数据口径见 [data_notes.md](./data_notes.md)，历史修正见 [AUDIT_REPORT.md](./AUDIT_REPORT.md)。

## 技术栈

- Next.js 16 (App Router) + TypeScript（⚠️ Next.js 16 有破坏性变更，写代码前参考 `node_modules/next/dist/docs/`）
- Tailwind CSS v4（CSS-first，配置全在 [app/globals.css](./app/globals.css)，**没有** `tailwind.config.ts`）
- shadcn/ui（`base-nova` style + neutral base；组件在 [components/ui](./components/ui)）
- 状态：`zustand`（规划器跨组件）
- 拖拽：`@dnd-kit`（桌面 & 手机）
- 动画：`framer-motion`（克制使用）
- 图标：`lucide-react`
- 部署：Vercel

## 设计基调（硬约束，与通常的"配色建议"不同——这是要写进代码的审美规则）

**关键词**："如果无印良品设计了宝可梦的官方应用"。Linear / Notion / Arc 的克制现代感 + 日系杂志留白 + 一点点宝可梦温柔点缀。

### 色彩
- 背景 `--background`：奶油白 `#FAFAF8`
- 正文 `--foreground`：近黑 `#2C2C2C`（不要 `#000`）
- CTA `--primary`：深森林绿 `#2F4B3F`（稳定、不抢眼）
- 点缀（Pokopia pastel，都在 `--pkp-*`）：粉 `#F8BBD0` / 薄荷 `#BEE8D4` / 天空蓝 `#C6E0F5` / 浅黄 `#FDF1C9` / 蜜桃 `#FCE0D0` / 沙色 `#EFE0C8` / 薰衣草 `#D6CEE5`
- **所有颜色都低饱和**。badge 一律"浅色填充 + 深色文字"（例：`bg-pkp-mint text-pkp-mint-ink`），**绝不**纯色撞击

### 形状 / 阴影 / 留白
- 卡片 `rounded-2xl` / `rounded-3xl`；基础 `--radius: 0.875rem`
- 只用 `shadow-sm` / `shadow-md`；**不要** `shadow-lg/xl`
- 留白要慷慨，宁可疏也别挤

### 字体
- 中文 Noto Sans SC / 苹方；英文数字 Inter；等宽 Geist Mono（仅数据/编号场景）
- 标题 `font-semibold`，正文 `font-normal`
- 字体变量：`--font-inter` `--font-noto-sc` `--font-geist-mono`（在 [app/layout.tsx](./app/layout.tsx)）

### 图标 / emoji
- Lucide 图标（`lucide-react`），线条细
- emoji 只在环境标签做点缀：🌞 明亮 / 🔥 温暖 / 💧 潮湿 / 🏜️ 干燥 / 🌙 昏暗 / ❄️ 凉爽（常量见 [types/pokemon.ts](./types/pokemon.ts) `ENVIRONMENT_EMOJI`）
- 不要满屏 emoji 当装饰

### 动效
- hover：`-translate-y-0.5 + shadow-md`，已抽成 `.pkp-lift` 工具类（在 globals.css）
- 卡片进场用 `framer-motion` 的短 stagger（≤200ms），不要大幅度

### 宝可梦身份细节（克制使用）
- 精灵球 SVG 点缀、柔和像素画、圆润卡通插画 —— 不做主视觉
- 背景可选 `.pkp-paper`（极淡的点阵纸纹）

### 反面教材（禁区）
- ❌ 52poke / Bulbapedia 信息密集资料库
- ❌ 高饱和红黄蓝撞色、儿童向游戏感
- ❌ Windows XP 大圆角 + 大渐变按钮
- ❌ 满屏 emoji、CTA 用渐变背景

## 代码约束（比设计更硬）

- **响应式**：桌面优先（≥1024px 为主设计），手机（~375px）必须好用；筛选器折叠为 `Sheet` 抽屉，拖拽规划器在手机上降级为"点格子→点宝可梦"
- **图标加载**：所有宝可梦图标经 `<PokemonIcon>` 组件，`icon_url` → `icon_url_fallback` 自动 `onError` 切换
- **不可入住过滤**：规划器 / 相似度 / 循环检测按 `is_playable === true` 过滤；图鉴保留全部 300 只
- **环境约束**：**每个 4×4 格子是独立环境**。同地图不同格子可以不同环境；同连排的重叠区物品被所有格子共享
- **地图上限**：5 张地图 × 25 只 = 最多 125 只进入规划；超限宝可梦不显示
- **环境的 3 条轴（用户 2026-04-19 第二次纠偏）**：
  - **明亮 ⟷ 昏暗**（bright-dim 轴）
  - **温暖 ⟷ 凉爽**（warm-cool 轴）
  - **潮湿 ⟷ 干燥**（dry-humid 轴）
  - 同一轴上两个值**互斥**，不能同时启用；不同轴之间可以**叠加**。一个 4×4 格子最多可以同时启用 3 个值（每轴一个）。
  - 例：一个格子可以是"明亮 + 温暖 + 潮湿"；喜欢其中任意一个的宝可梦都能在里面舒适
- **5 张地图名字（游戏内官方）**：干巴巴荒野的城镇 / 暗沉沉海边的城镇 / 凸隆隆山地的城镇 / 亮晶晶空岛的城镇 / 空空镇
- **相似度算法（用户 2026-04-19 第 2 次钉死）**：
  - 过滤：`!a.is_playable || !b.is_playable` → `null`
  - **同轴不同值**（例如 温暖 vs 凉爽） → `0`（物理上无法共存）
  - 同一 env → 基础 +40
  - 不同轴（例 温暖 vs 明亮） → 轴独立加分：+15（在叠加格子里可共存，但相似度不如同 env）
  - `taste` 相同 +20；`likes` Jaccard × 40
  - 上限 100
- **规划器：从"多地图分配"改为"单地图 terrace 精算"**：
  - 前期玩家每张图各建一个 3 连排 terrace；规划器重点是 **terrace 内部的居住地排布 + 重叠区物品放置**
  - Item 放置效率原则：**尽量把物品放在重叠区**（被更多格子共享 → 相同数量物品覆盖更多宝可梦）
  - 单个 cell 的私有区只放"这个格子独占 env 偏好"的物品
  - 3 连排中：L-M 重叠区物品被 L+M 格子享受；M-R 重叠区物品被 M+R 格子享受；中间 M 格子的物品对三个都可见（但放在 L-M 或 M-R 重叠区比 M 私有区更高效，因为 M 自己也能享受到重叠区）

## 目录结构

```
app/                # Next.js App Router（各功能页）
components/         # 业务组件（PokemonCard, CellGrid, FilterSidebar, ...）
components/ui/      # shadcn/ui（不要手改，靠 shadcn add 追加）
lib/                # data / cycles / similarity / planner 算法
store/              # zustand
types/pokemon.ts    # 领域类型（权威）
data/pokemon.json   # 300 只 + constants（包含 game_mechanics / cycles / specialty_roles）
scripts/            # scrape_pokopiamap.ts（Step 9 跑）
```

## 开发启动

```
pnpm install
pnpm dev    # → http://localhost:3000
```

## 工作节奏（用户 2026-04-19 钉死）

**默认继续，不要每个 step 都停下确认。** 做完一 step，简短汇报 + 直接开始下一 step。只有"不同方向的二选一"才 ask；纯工程推进不需要 ask。列选项时直接帮他挑最贴谱的那个并开始做。

## 绝对不要

- 不要给卡片堆 `shadow-lg` / `shadow-xl`
- 不要给 CTA 用渐变背景
- 不要在规划器计算里忘记过滤 `is_playable`
- 不要把一条资源循环切到多张地图（链条会断）
- 不要硬性要求一张地图一种环境（纠偏：单格子为环境单位）
- 不要手改 [components/ui/](./components/ui)（用 `pnpm dlx shadcn@latest add` 或 `--overwrite`）
