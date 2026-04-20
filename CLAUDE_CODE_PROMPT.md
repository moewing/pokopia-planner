# Pokopia 宝可梦居住地规划助手 —— Claude Code Prompt

## 使用方法

1. 创建空文件夹：`mkdir pokopia-planner && cd pokopia-planner`
2. 把交付的 4 个文件放进去（`pokemon.json`、`pokemon.csv`、`data_notes.md`、`scrape_pokopiamap.ts`）
3. 运行 `claude` 进入 Claude Code
4. 把本文件**以下内容全部粘贴**进去

---

我想 vibe code 一个 **Pokopia 宝可梦居住地规划助手** 网站，帮我按以下需求从零搭建。

## 技术栈

- **框架**：Next.js 14+ (App Router) + TypeScript
- **样式**：Tailwind CSS + shadcn/ui
- **状态**：Zustand（规划器跨组件状态）
- **拖拽**：`@dnd-kit/core`（手机和电脑都要流畅）
- **图表**：可选 recharts（相似度矩阵可视化）
- **部署**：Vercel
- **响应式**：桌面优先设计，手机自适应（断点 md=768px）

## 数据

已提供 `/data/pokemon.json`（300 只宝可梦完整数据）。详见 `/data_notes.md`。

**结构**：
```typescript
interface Pokemon {
  id: number;
  name: string;
  name_tw: string | null;
  icon_url: string;                // 宝可梦图标 URL (pokopiamap.com CDN)
  icon_url_fallback: string;       // 备用图标 (PokeAPI, 防止主 CDN 不稳)
  specialties: string[];           // 中文特长：栽培/乱撒/伐木/点火/滋润 等
  specialties_en: string[];
  littered_items: string[];        // 乱撒物（仅特长含"乱撒"时有）
  env: string | null;              // 6 种喜欢环境之一
  taste: string | string[] | null; // 5 种喜欢口味之一
  likes: string[];                 // 喜欢事物标签
  type: string[] | null;           // 属性（草/毒等）- 待 scraper 补
  time_of_day: string[] | null;    // 待补
  weather: string[] | null;        // 待补
  habitats: string[];              // 推荐栖息地（阶段1用）- 待补
  notes: string[];
}
```

**图片加载注意**：
- 主图 `icon_url` 指向 `pokopiamap.com`，是 Pokopia 游戏内立绘
- 如果主图加载失败（403/超时），fallback 到 `icon_url_fallback`（PokeAPI GitHub CDN）
- 建议实现 `<PokemonIcon>` 组件，用 `onError` 自动切换到 fallback：
  ```tsx
  <img 
    src={pokemon.icon_url} 
    onError={(e) => { (e.target as HTMLImageElement).src = pokemon.icon_url_fallback; }}
    alt={pokemon.name}
    loading="lazy"
  />
  ```

## 游戏核心机制（务必先完全理解，这些纠偏来自玩家实测）

### 四个容易混淆的概念

| 概念 | 作用 | 字段 |
|---|---|---|
| 栖息地（Habitat） | 搭建蓝图吸引野生宝可梦出现（**阶段1发现**） | `habitats` |
| 喜欢的环境（Env） | 6 大类：明亮/温暖/潮湿/干燥/昏暗/凉爽。宝可梦在喜欢的环境居住才会舒适 | `env` |
| 喜欢的事物（Likes） | 摆放在居住地范围内进一步提升舒适度 | `likes` |
| 是否可入住（Playable）| 主角（百变怪）和神兽不可入住居住地 | `is_playable` |

### 🗺️ 地图机制（超关键，规划器的核心约束）

- **全游戏共 5 张地图**
- **每张地图上限 25 只宝可梦**
- **超过上限的后果**：多余的宝可梦会**不显示**（需要用甜甜蜜吸引才能看到）。未显示的宝可梦无法参与该地图的资源循环
- **因此规划策略**：**同一条资源循环链的宝可梦必须在同一张地图里**，且不能让这张地图超 25 只
- **推论**：3 条资源循环建议分散在不同地图，避免某个链条因地图溢出而断掉。比如：
  - 地图 A：木材循环（昏暗环境的乱撒小圆木 + 分类 + 伐木宝可梦）
  - 地图 B：红砖循环（潮湿/干燥的乱撒黏土 + 温暖的点火 + 分类）
  - 地图 C：铁条循环（乱撒垃圾 + 回收利用 + 点火 + 分类）
  - 地图 D、E：后期精致打造

### 🏡 空间布局机制（纠偏！之前理解有误）

**✅ 正确理解**：
- **最小格子**：4×4 空间 = 1 个居住地，可住 **6 只宝可梦**
- **【关键】每个 4×4 最小格子内部可以是独立的喜欢环境**。两个挨在一起的格子可以一个是"潮湿"一个是"明亮"，宝可梦按各自偏好分到不同环境的格子
- **相邻共用边**：2 个挨一起 = 4×7，3 个挨一起 = 4×10
- **居住地判定范围**：每个最小格子以自己为中心，**12×12 范围内**都算居住地
- **重叠区物品共享**：3 个格子连排时，居住地范围 12×18，中间 **6×12 重叠区**的物品被 18 只宝可梦全部共享（不管它们住在哪个具体环境格子里）

**❌ 错误理解（早期版本误解，需纠正）**：
- ~~"同一连排的 18 只宝可梦必须喜欢同一环境"~~ → 错！格子环境是各自独立的
- ~~"按环境聚类分配"~~ → 不必要，环境约束在单格子内，连排无需环境一致

**✅ 真正的最优策略**：
- 同一地图内：保证 ≤25 只 + 资源循环完整性
- 连排格子内：宝可梦按各自喜欢的环境分到不同 4×4 格子
- 重叠区：放能覆盖最多宝可梦喜好的物品组合（最大化 Jaccard 覆盖）

### 资源循环系统

3 条资源循环 + 1 种一次性加工：

**资源循环**（需要乱撒宝可梦持续产出原料）：
- **木材循环**：乱撒(小圆木) + 分类 + 伐木 → 木材
- **红砖循环**：乱撒(软塌塌黏土) + 分类 + 点火 → 红砖
- **铁条循环**：乱撒(不可燃垃圾) + 分类 + 回收利用 + 点火 → 铁 → 铁条

**一次性加工**（玩家自己从环境捡素材交给特长宝可梦）：
- 废纸 → 纸：玩家拾取废纸 + 回收利用

**重要数据洞察**（你建算法时一定要知道）：
- 由于 **每个环境内都无法自给任何一条资源循环**（见下方数据），资源循环必然跨环境
- 这恰好印证了"每个 4×4 格子独立环境"机制的必要性——**一张地图内不同格子可以是不同环境，让跨环境的宝可梦都能住在一起**
- 例：红砖循环地图里，可以一个 4×4 是温暖（住点火宝可梦），旁边一个 4×4 是潮湿（住乱撒黏土的乌波/土王）
- **反过来，如果硬要一张地图一种环境**（错误的前期理解），资源循环根本不可能完整！

## 功能需求（5 个模块）

### 1. 图鉴页 `/pokedex`

- **卡片网格**展示所有宝可梦（桌面 4-6 列，手机 2 列）
- 每张卡片显示：编号、名字、特长 badge、喜欢环境 badge、口味 icon
- **筛选器**（桌面左侧边栏，手机顶部抽屉）：
  - 按环境筛选（6 选项）
  - 按特长筛选（约 30 个选项，分组：乱撒类 / 分类类 / 加工类 / 功能类）
  - 按口味筛选（5 选项）
  - 按乱撒物筛选
  - 按喜欢事物筛选（多选）
  - 搜索框（名字模糊搜索）
- 点击卡片打开详情 Dialog：
  - 完整信息
  - "可以和它组资源循环的宝可梦"（同环境且特长互补）
  - "可能适合住一起的宝可梦"（相似度 Top 10）

### 2. 循环配方页 `/recipes`

- 3 个循环卡片（木材 / 红砖 / 铁条）+ 1 个一次性加工卡片（废纸→纸）
- 每个卡片展示：
  - 循环流程图（用 mermaid 或自己画简单 SVG）
  - 每个环节匹配到的宝可梦列表
  - "一键推荐最优组合"按钮：自动挑选各环节各 1 只，环境尽量一致
- 顶部额外展示"其他乱撒物"：藤蔓绳、线团、棉花、石头、铁、叶子等，说明"这些目前只收集不加工"

### 3. 规划器-前期模式 `/planner/early` ⭐ 重点

**目标**：快速攒舒适度等级，资源循环导向

**核心约束**（基于纠正后的理解）：
1. 全游戏 **5 张地图**，每张上限 **25 只**
2. 同一条资源循环的宝可梦**必须在同一张地图**（否则链条断掉）
3. **每个 4×4 格子内部是独立环境**——不同环境的宝可梦可以在同一张地图的不同格子里
4. 连排格子的 **重叠区物品被所有 18 只共享**（不管它们住哪个环境格子）

**两种子模式（切换）**：

**模式 A：自动推荐**
- 从宝可梦池多选想养的（3-125 只，即 5 张地图上限）
- 算法输出：
  1. **多地图分配方案**（最多 5 张地图）：每张地图分配哪些宝可梦
  2. 每张地图内部的**格子布局**（几个 4×4 连排，每格 6 只，可各自不同环境）
  3. 每张地图的：承载资源循环、总人数（必须≤25）、重叠区推荐物品清单
  4. 整体指标：完整循环数 / 舒适度平均分 / 地图利用率

**算法伪代码**：
```typescript
function planEarlyMode(selected: Pokemon[]): PlanResult {
  const MAX_MAPS = 5;
  const MAX_PER_MAP = 25;
  const PER_CELL = 6;
  
  // 过滤掉不可入住的
  const playable = selected.filter(p => p.is_playable);
  
  // 1. 【先按资源循环需求分配到不同地图】
  //    优先级: 资源循环完整性 > 人数上限 > 其他
  const maps: Map[] = [];
  
  // 识别用户选中的宝可梦能形成哪些循环
  const cycleTeams = identifyCycleTeams(playable);
  // cycleTeams: [{cycle: 'wood_cycle', pokemon: [...], missing: []}, ...]
  
  // 每个循环占一张地图(如果人数 ≤25)
  for (const team of cycleTeams) {
    if (team.pokemon.length <= MAX_PER_MAP) {
      maps.push({ theme: team.cycle, pokemon: team.pokemon, capacity: MAX_PER_MAP });
    } else {
      // 超过上限,提示用户裁剪
    }
  }
  
  // 2. 剩余宝可梦(不参与任何循环的)分配到剩余地图
  const remaining = playable.filter(p => !isInAnyMap(p, maps));
  distributeToRemainingMaps(remaining, maps, MAX_MAPS - maps.length);
  
  // 3. 【每张地图内部】按宝可梦的喜欢环境分到不同的 4×4 格子
  for (const map of maps) {
    const envGroups = groupBy(map.pokemon, p => p.env);
    // 每个环境组分成 6 只/格,允许一张地图里有多种环境
    map.cells = [];
    for (const [env, group] of envGroups) {
      const subCells = chunk(group, PER_CELL);
      for (const sc of subCells) {
        map.cells.push({ env, pokemon: sc });
      }
    }
    // 格子数决定布局(2格连排=4x7, 3格=4x10...)
    // 如果格子数>3,可以分成多个连排组
  }
  
  // 4. 【重叠区物品推荐】对连排的格子集,计算共享 likes 并集
  //    选出覆盖最多宝可梦的 Top N 物品
  for (const map of maps) {
    const adjacentGroups = groupAdjacentCells(map.cells);
    for (const group of adjacentGroups) {
      const allPokemon = group.flatMap(c => c.pokemon);
      const likesCount = countLikes(allPokemon);
      group.overlapItems = topN(likesCount, 10);  // 推荐 Top 10 物品
      group.coverage = calculateCoverage(allPokemon, group.overlapItems);
    }
  }
  
  return { maps, warnings };
}
```

**模式 B：可视化拖拽**
- 左侧宝可梦池（已勾选的，标明各自喜欢环境/特长）
- 右侧有 **5 个地图 Tab**，可切换
- 每个地图 Tab 里是格子布局画布（可用 `+` 添加/删除 4×4 格子，每格可选环境）
- 拖拽宝可梦到格子
- 实时显示：
  - **当前地图人数 / 25**（红色超限警告）
  - 每格宝可梦是否在自己喜欢的环境（不匹配的显示 ⚠️）
  - 当前地图里有哪些特长、能跑通哪些循环（缺哪环标红）
  - 重叠区物品建议（按覆盖宝可梦数排序）
  - 每只宝可梦的舒适度预估（环境匹配 + 重叠区是否有喜欢的物品）

### 4. 规划器-后期模式 `/planner/late` ⭐ 新功能

**目标**：打造精致空间，相似度导向

**纠偏说明**：与前期模式一样，后期的"精致空间"也可以在同一张地图里建不同环境的 4×4 格子。**相似度计算不再强制要求同环境**，改为"同环境加分，不同环境也可共住"。

**核心算法：宝可梦相似度计算（已更新）**

```typescript
function similarity(a: Pokemon, b: Pokemon): number {
  // 过滤不可入住的(百变怪、神兽)
  if (!a.is_playable || !b.is_playable) return null;  // 不参与相似度
  
  let score = 0;
  
  // 1. 环境（相同加分，不同不扣分，因为可以住不同格子）
  if (a.env === b.env) score += 40;
  
  // 2. 口味（相同加分）
  if (a.taste === b.taste) score += 20;
  
  // 3. 喜欢事物重合度（Jaccard 相似度，最重要维度）
  const aLikes = new Set(a.likes);
  const bLikes = new Set(b.likes);
  const intersection = [...aLikes].filter(x => bLikes.has(x)).length;
  const union = new Set([...aLikes, ...bLikes]).size;
  score += (intersection / union) * 40;
  
  return Math.round(score);
}
```

**UI 设计**：
- 选择 4-10 只宝可梦（自动过滤不可入住的）
- 显示**相似度矩阵**（桌面友好，手机上简化为列表）
  - 颜色标记：绿色 >70 分 / 黄色 40-70 / 红色 <40
- **自动分组建议**：把相似度高的聚在一起，4-6 只一组
- **共同布置清单**：列出这组宝可梦的
  - 环境分布（可能是一个格子一种环境，或全部同一种环境）
  - 共同口味（最好一致）
  - 共同喜欢的事物（按被多少只宝可梦喜欢排序）

### 5. 数据纠错页 `/edit`

- 表格展示所有宝可梦，可筛选（包含 is_playable 字段）
- 点击任一字段可编辑
- 改动存在 localStorage
- 顶部"导出 JSON"按钮，下载修改后的 `pokemon.json`
- 顶部"重置"按钮，恢复默认数据

## 文件结构

```
pokopia-planner/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # 首页(介绍+导航到4个功能)
│   ├── pokedex/page.tsx
│   ├── recipes/page.tsx
│   ├── planner/
│   │   ├── early/page.tsx
│   │   └── late/page.tsx
│   └── edit/page.tsx
├── components/
│   ├── PokemonCard.tsx
│   ├── PokemonDetail.tsx
│   ├── FilterSidebar.tsx
│   ├── CellGrid.tsx                # 格子可视化组件
│   ├── SimilarityMatrix.tsx
│   └── ui/                         # shadcn/ui 组件
├── lib/
│   ├── planner.ts                  # 前期规划器算法
│   ├── similarity.ts               # 相似度算法
│   ├── cycles.ts                   # 资源循环检测
│   └── data.ts                     # 数据加载 + localStorage 合并
├── types/
│   └── pokemon.ts
├── data/
│   └── pokemon.json                # 主数据（已提供）
├── scripts/
│   └── scrape_pokopiamap.ts        # 补全扩展字段（已提供）
└── store/
    └── plannerStore.ts             # Zustand
```

## 开工步骤

请按此顺序，每步完成后**给我报告进展再继续**：

### Step 1: 项目初始化
- `pnpm create next-app@latest` 初始化
- 配置 Tailwind + shadcn/ui + TypeScript
- 把我给的 `pokemon.json` 放入 `/data/`
- 创建基础的 `/types/pokemon.ts`

### Step 2: 数据层
- 写 `lib/data.ts` 加载 JSON，合并 localStorage 修改
- 写 `lib/cycles.ts` 封装 3 条资源循环 + 1 条一次性加工的检测函数
- 写 `lib/similarity.ts` 相似度算法

### Step 3: 图鉴页
- 完整的筛选器 + 网格展示 + 详情 Dialog

### Step 4: 循环配方页
- 4 个卡片（3 循环 + 1 一次性加工）+ 推荐组合生成

### Step 5: 规划器-前期模式
- 先做模式 A（自动推荐）
- 再做模式 B（拖拽）

### Step 6: 规划器-后期模式
- 相似度矩阵 + 自动分组

### Step 7: 数据纠错页
- 可编辑表格 + 导出

### Step 8: 部署准备
- `vercel.json` 配置
- `README.md` 写清楚：开发启动、部署方法、数据补全方法（跑 scraper）

### Step 9（可选）: 扩展字段补全
- 运行 `scripts/scrape_pokopiamap.ts` 补齐 `type`, `habitats` 等字段
- 在图鉴详情里展示"去哪发现这只宝可梦"的栖息地信息

## 设计风格

- **整体感觉**：清爽 minimalist，柔和的粉/蓝/绿配色（参考 Pokopia 游戏本体）
- **圆角卡片**，柔和阴影
- **emoji 图标**用于环境/特长快速识别（🌞明亮 🔥温暖 💧潮湿 🏜️干燥 🌙昏暗 ❄️凉爽）
- **深色模式**支持（shadcn/ui 自带）
- **手机体验**：筛选器改抽屉，拖拽改点选，网格改 2 列

## 注意事项

1. 遇到数据相关的不确定（具体有哪些环境、具体特长名），**先列假设让我确认**
2. 算法实现前先写伪代码/流程图给我看
3. 前期模式的"资源循环检测"要考虑：一个格子 6 只不够完整一个循环怎么办（算法应允许跨格子跨宝可梦组合，或提示缺失某环节）
4. 后期模式相似度计算中，环境不同应该直接设为不能住一起（返回 0）
5. 每个功能模块至少要在桌面和手机各截图确认响应式 OK

开始吧！先执行 Step 1，完成后告诉我进展。

---

## 附录：特长分类速查（用于前端 badge 颜色/分组）

**资源循环相关**（用醒目的颜色，比如深橙色）：
- 🎲 乱撒
- 📦 分类、收纳
- ⚒️ 伐木、点火、回收利用

**功能类**（用中性颜色）：
栽培、滋润、交易、飞翔、找东西、建造、碾压、重踏、瞬间移动、带动气氛、发电、变身、鉴定、彩绘、DJ、工匠、梦岛、贪吃鬼、哈欠、开派对、爆炸、收藏家、采蜜、稀有物、发光、不明

**已知游戏里共 31 种特长**，数据里可能会看到某些特长只在个别宝可梦身上出现（如皮卡丘独有的"发光"Illuminate，卡比兽独有的"贪吃鬼"）。
