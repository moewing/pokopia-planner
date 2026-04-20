"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Grid3x3,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PokemonIcon } from "@/components/pokemon-icon";
import { PokemonDetail } from "@/components/pokemon-detail";
import { PlannerSelector } from "@/components/planner-selector";
import { ManualPlanner } from "@/components/manual-planner";
import { TerracePlanner } from "@/components/terrace-planner";
import { usePlannerStore, useSelectedPokemon } from "@/store/planner-store";
import { planEarlyMode, type MapPlan, type PlanResult } from "@/lib/planner";
import { CYCLE_META } from "@/lib/cycles";
import { cn } from "@/lib/utils";
import {
  ENVIRONMENT_CLASSES,
  ENVIRONMENT_EMOJI,
  type Environment,
  type Pokemon,
} from "@/types/pokemon";

export default function PlannerEarlyPage() {
  const selected = useSelectedPokemon();
  const hasHydrated = usePlannerStore((s) => s.hasHydrated);
  const { addCycleStarterPack } = usePlannerStore();
  const [detail, setDetail] = useState<Pokemon | null>(null);

  const plan = useMemo<PlanResult>(
    () => planEarlyMode(selected),
    [selected],
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Early-game Planner
          </span>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            前期规划器
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            前期目标是让单张地图的舒适度尽快攒上去。默认进入"单地图精算"——按 3 条环境轴（明暗/冷暖/燥湿）
            给居住地叠加格子，再把物品往重叠区塞以效率最大化。如果要看算法推荐的多地图分配，切到右边的 Tab。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-full border-border/60 bg-background px-2.5 py-0.5 text-xs"
          >
            已选 {selected.length} / 125
          </Badge>
          <PlannerSelector triggerVariant="default" />
        </div>
      </header>

      {!hasHydrated ? null : selected.length === 0 ? (
        <EmptyCta onStarterPack={addCycleStarterPack} />
      ) : (
        <Tabs defaultValue="terrace" className="flex flex-col gap-5">
          <TabsList className="w-fit">
            <TabsTrigger value="terrace">单地图精算</TabsTrigger>
            <TabsTrigger value="auto">多地图分配</TabsTrigger>
            <TabsTrigger value="manual">手动调整</TabsTrigger>
          </TabsList>

          <TabsContent value="terrace">
            <TerracePlanner onPick={(p) => setDetail(p)} />
          </TabsContent>

          <TabsContent value="auto" className="flex flex-col gap-5">
            <MetricsStrip plan={plan} />

            {plan.warnings.length > 0 ? (
              <Card className="rounded-3xl border-amber-400/30 bg-amber-50/40 shadow-sm">
                <CardContent className="flex items-start gap-3 p-4 text-sm text-amber-900/80">
                  <AlertTriangle className="mt-0.5 size-4" strokeWidth={1.75} />
                  <ul className="flex-1 space-y-0.5">
                    {plan.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            <section className="grid items-start gap-4 xl:grid-cols-2">
              {plan.maps.map((m) => (
                <MapPlanCard
                  key={m.id}
                  map={m}
                  onPick={(p) => setDetail(p)}
                />
              ))}
            </section>

            {plan.orphans.length > 0 ? (
              <OrphansCard
                orphans={plan.orphans}
                onPick={(p) => setDetail(p)}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="manual">
            <ManualPlanner onPick={(p) => setDetail(p)} />
          </TabsContent>
        </Tabs>
      )}

      <PokemonDetail
        pokemon={detail}
        onOpenChange={(o) => !o && setDetail(null)}
        onSelect={(p) => setDetail(p)}
      />
    </div>
  );
}

// --------------------------------------------------------------------------
// Empty CTA
// --------------------------------------------------------------------------

function EmptyCta({ onStarterPack }: { onStarterPack: () => void }) {
  return (
    <Card className="rounded-3xl border-dashed border-border/60 bg-card/60 shadow-none">
      <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-3xl bg-pkp-mint text-pkp-mint-ink">
          <Wand2 className="size-7" strokeWidth={1.5} />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-semibold">先选几只宝可梦，再规划</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            点右上"调整选择"从 287 只可入住宝可梦里挑，或者直接用入门包：
            两只一循环覆盖三条资源链。
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onStarterPack} className="rounded-full gap-1.5">
            <Sparkles className="size-4" strokeWidth={1.75} />
            来一份循环入门包（10 只）
          </Button>
          <PlannerSelector triggerLabel="自己挑" />
        </div>
      </CardContent>
    </Card>
  );
}

// --------------------------------------------------------------------------
// Metrics strip
// --------------------------------------------------------------------------

function MetricsStrip({ plan }: { plan: PlanResult }) {
  const m = plan.metrics;
  const cells = [
    {
      icon: CheckCircle2,
      label: "完整循环",
      value: `${m.cyclesComplete} / 3`,
      hint: m.paperDoable ? "＋废纸加工可做" : "废纸加工未启用",
      accent: "bg-pkp-mint text-pkp-mint-ink",
    },
    {
      icon: Users,
      label: "入住人数",
      value: `${m.totalAssigned}`,
      hint: `地图容量 ${m.totalCapacity}（${Math.round(m.mapFillPct * 100)}%）`,
      accent: "bg-pkp-peach text-pkp-peach-ink",
    },
    {
      icon: Grid3x3,
      label: "使用地图",
      value: `${m.mapsUsed} / 5`,
      hint: "每张上限 25",
      accent: "bg-pkp-sky text-pkp-sky-ink",
    },
    {
      icon: Sparkles,
      label: "舒适度",
      value: `${m.avgComfort}`,
      hint: "环境匹配 + 重叠物品覆盖",
      accent: "bg-pkp-pink text-pkp-pink-ink",
    },
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cells.map(({ icon: Icon, label, value, hint, accent }) => (
        <Card
          key={label}
          className="rounded-3xl border-border/60 bg-card shadow-sm"
        >
          <CardContent className="flex items-center gap-3 p-4">
            <span
              className={cn(
                accent,
                "inline-flex size-10 items-center justify-center rounded-2xl",
              )}
            >
              <Icon className="size-5" strokeWidth={1.75} />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                {label}
              </span>
              <span className="font-semibold leading-tight">{value}</span>
              <span className="truncate text-[11px] text-muted-foreground">
                {hint}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

// --------------------------------------------------------------------------
// Map plan card
// --------------------------------------------------------------------------

function MapPlanCard({
  map,
  onPick,
}: {
  map: MapPlan;
  onPick: (p: Pokemon) => void;
}) {
  const empty = map.pokemon.length === 0;
  const themeMeta =
    map.theme === "mixed" || map.theme === "empty"
      ? null
      : CYCLE_META[map.theme];

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-3xl border-border/60 bg-card shadow-sm",
        empty && "opacity-70",
      )}
    >
      <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                themeMeta?.accent ?? "bg-muted text-muted-foreground",
                "inline-flex size-9 items-center justify-center rounded-2xl font-mono text-xs",
              )}
            >
              {map.label.slice(-1)}
            </span>
            <div className="flex flex-col">
              <span className="font-semibold leading-tight">{map.label}</span>
              <span className="text-[11px] text-muted-foreground">
                {themeMeta
                  ? `主承载 · ${themeMeta.name}`
                  : map.theme === "mixed"
                    ? "混合 · 未锁定循环"
                    : "空置"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                map.pokemon.length > 25
                  ? "border-destructive/40 bg-destructive/5 text-destructive"
                  : "border-border/60 bg-background text-foreground/70",
              )}
            >
              {map.pokemon.length} / 25
            </Badge>
          </div>
        </header>

        {/* Cycle completeness chips */}
        {!empty ? <CycleChips map={map} /> : null}

        {/* Cells */}
        {map.terraces.length > 0 ? (
          <div className="flex flex-col gap-3">
            {map.terraces.map((t) => (
              <div key={t.id} className="flex flex-col gap-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {t.cells.map((c) => {
                    const cls = ENVIRONMENT_CLASSES[c.env];
                    return (
                      <div
                        key={c.id}
                        className={cn(
                          cls.border,
                          "flex flex-col gap-2 rounded-2xl border p-3",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              cls.bg,
                              cls.text,
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                            )}
                          >
                            <span aria-hidden>
                              {ENVIRONMENT_EMOJI[c.env]}
                            </span>
                            {c.env}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            4×4 · {c.pokemon.length}/6
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {c.pokemon.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => onPick(p)}
                              title={`${p.name} #${p.id}`}
                              className="inline-flex rounded-full border border-transparent hover:border-border"
                            >
                              <PokemonIcon pokemon={p} size={32} />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {t.overlapItems.length > 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-3">
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        重叠区推荐物品
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {t.sharedPokemonCount} 只共用
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.overlapItems.map((o) => (
                        <Badge
                          key={o.item}
                          variant="outline"
                          className="rounded-full border-pkp-mint-ink/20 bg-pkp-mint px-2 py-0.5 text-[11px] text-pkp-mint-ink"
                        >
                          {o.item}
                          <span className="ml-1 font-mono text-[10px] opacity-70">
                            ×{o.count}
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            这张地图暂时没有安排
          </div>
        )}

        {map.warnings.length > 0 ? (
          <ul className="space-y-0.5 rounded-2xl bg-amber-50/60 px-3 py-2 text-[11px] text-amber-900/80">
            {map.warnings.map((w, i) => (
              <li key={i}>⚠ {w}</li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CycleChips({ map }: { map: MapPlan }) {
  const entries = [
    { key: "wood" as const, report: map.cycleReport.wood_cycle, label: "木材" },
    { key: "brick" as const, report: map.cycleReport.brick_cycle, label: "红砖" },
    { key: "iron" as const, report: map.cycleReport.iron_bar_cycle, label: "铁条" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {entries.map(({ key, report, label }) => {
        const complete = report.complete;
        return (
          <span
            key={key}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
              complete
                ? "border-pkp-mint-ink/20 bg-pkp-mint text-pkp-mint-ink"
                : "border-border/60 bg-muted/40 text-muted-foreground",
            )}
            title={
              complete
                ? "循环完整"
                : `缺 ${report.missingRoles.join("/")}`
            }
          >
            {complete ? "✓" : "–"} {label}
          </span>
        );
      })}
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
          map.cycleReport.paper.doable
            ? "border-pkp-lavender-ink/20 bg-pkp-lavender text-pkp-lavender-ink"
            : "border-border/60 bg-muted/40 text-muted-foreground",
        )}
        title={map.cycleReport.paper.doable ? "废纸可做" : "无回收利用宝可梦"}
      >
        {map.cycleReport.paper.doable ? "✓" : "–"} 废纸
      </span>
    </div>
  );
}

// --------------------------------------------------------------------------
// Orphans
// --------------------------------------------------------------------------

function OrphansCard({
  orphans,
  onPick,
}: {
  orphans: Pokemon[];
  onPick: (p: Pokemon) => void;
}) {
  return (
    <Card className="rounded-3xl border-dashed border-border/60 bg-card/60 shadow-none">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Overflow
            </span>
            <h3 className="text-base font-semibold">
              超出 125 容量的 {orphans.length} 只
            </h3>
          </div>
          <Separator orientation="vertical" className="hidden h-6 sm:block" />
          <span className="text-[11px] text-muted-foreground">
            在游戏里它们不会显示 / 参与循环，建议从选择里去掉
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {orphans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p)}
              className="inline-flex"
              title={`${p.name} #${p.id}`}
            >
              <PokemonIcon pokemon={p} size={32} />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
