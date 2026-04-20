"use client";

import { Fragment, useMemo, useState } from "react";
import { ArrowRight, MapPin, Package, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PokemonIcon } from "@/components/pokemon-icon";
import { useSelectedPokemon } from "@/store/planner-store";
import { planTerrace, type CellLayout, type Zone } from "@/lib/terrace";
import { cn } from "@/lib/utils";
import {
  ENVIRONMENT_CLASSES,
  ENVIRONMENT_EMOJI,
  MAP_NAMES,
  type Environment,
  type MapName,
  type Pokemon,
} from "@/types/pokemon";

interface Props {
  onPick: (p: Pokemon) => void;
}

/**
 * Single-map terrace planner — replaces the "spread across 5 maps" view.
 * Uses the new env-axis stacking rules to build 1–3 adjacent cells, then
 * assigns items to zones (private + overlap) for efficiency.
 */
export function TerracePlanner({ onPick }: Props) {
  const selected = useSelectedPokemon();
  const [mapName, setMapName] = useState<MapName>(MAP_NAMES[4]); // 空空镇 default

  const layout = useMemo(() => planTerrace(selected), [selected]);

  if (selected.length === 0) {
    return (
      <Card className="rounded-3xl border-dashed border-border/60 bg-card/60 shadow-none">
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          先选几只宝可梦再来精算。
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Map & stats */}
      <Card className="rounded-3xl border-border/60 bg-card shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <MapPin className="size-4 text-muted-foreground" strokeWidth={1.75} />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              地图
            </span>
            <div className="flex flex-wrap gap-1.5">
              {MAP_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setMapName(name)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                    mapName === name
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-background text-foreground/70 hover:bg-muted/60",
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCell
              label="入住宝可梦"
              value={`${layout.stats.pokemon}`}
              hint={`分布在 ${layout.cells.length} 格`}
            />
            <StatCell
              label="使用环境"
              value={`${layout.stats.envsRepresented}`}
              hint="最多 3 条轴 × 2 值"
            />
            <StatCell
              label="物品覆盖"
              value={`${layout.stats.likesCovered}`}
              hint="宝可梦×喜欢的命中数"
            />
            <StatCell
              label="满足率"
              value={`${Math.round(layout.stats.avgLikeSatisfaction * 100)}%`}
              hint="被满足的 likes 占比"
            />
          </div>

          {layout.warnings.length > 0 ? (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-50/40 px-3 py-2 text-xs text-amber-900/80">
              {layout.warnings.map((w, i) => (
                <div key={i}>⚠ {w}</div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Terrace flow */}
      <TerraceFlow layout={layout} onPick={onPick} />

      {/* Unhoused */}
      {layout.unhoused.length > 0 ? (
        <Card className="rounded-3xl border-dashed border-destructive/40 bg-destructive/5 shadow-none">
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              无法入住（同轴环境冲突 / 格子满员）
            </div>
            <div className="flex flex-wrap gap-2">
              {layout.unhoused.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPick(p)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2 py-1 text-xs"
                >
                  <PokemonIcon pokemon={p} size={20} />
                  {p.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

// --------------------------------------------------------------------------
// Stat cell
// --------------------------------------------------------------------------

function StatCell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl border border-border/60 bg-background p-3">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="text-lg font-semibold leading-tight">{value}</span>
      <span className="text-[10px] text-muted-foreground">{hint}</span>
    </div>
  );
}

// --------------------------------------------------------------------------
// Terrace flow (cells + zones in a row)
// --------------------------------------------------------------------------

function TerraceFlow({
  layout,
  onPick,
}: {
  layout: ReturnType<typeof planTerrace>;
  onPick: (p: Pokemon) => void;
}) {
  // Interleave cells with overlap zones: cell 0, overlap 0-1, cell 1, overlap 1-2, cell 2
  const items: Array<
    | { type: "cell"; cell: CellLayout; privateZone: Zone | undefined }
    | { type: "overlap"; zone: Zone }
  > = [];
  for (let i = 0; i < layout.cells.length; i++) {
    const privateZone = layout.zones.find(
      (z) => z.kind === "private" && z.coveredCells[0] === i,
    );
    items.push({ type: "cell", cell: layout.cells[i], privateZone });
    if (i < layout.cells.length - 1) {
      const overlapZone = layout.zones.find(
        (z) =>
          z.kind === "overlap" &&
          z.coveredCells[0] === i &&
          z.coveredCells[1] === i + 1,
      );
      if (overlapZone) items.push({ type: "overlap", zone: overlapZone });
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-start lg:gap-4">
      {items.map((it, idx) => (
        <Fragment key={idx}>
          {it.type === "cell" ? (
            <CellCard
              cell={it.cell}
              privateZone={it.privateZone}
              onPick={onPick}
            />
          ) : (
            <OverlapCard zone={it.zone} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

// --------------------------------------------------------------------------
// Cell card
// --------------------------------------------------------------------------

function CellCard({
  cell,
  privateZone,
  onPick,
}: {
  cell: CellLayout;
  privateZone: Zone | undefined;
  onPick: (p: Pokemon) => void;
}) {
  return (
    <Card className="flex-1 rounded-3xl border-border/60 bg-card shadow-sm lg:min-w-0">
      <CardContent className="flex flex-col gap-3 p-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-2xl bg-muted text-xs font-semibold">
              {String.fromCharCode(65 + cell.index)}
            </span>
            <span className="text-sm font-semibold">
              居住地 {String.fromCharCode(65 + cell.index)}
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            4×4 · {cell.pokemon.length}/6
          </span>
        </header>

        {/* Env stack */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            环境
          </span>
          {cell.envs.map((e) => {
            const cls = ENVIRONMENT_CLASSES[e as Environment];
            return (
              <Badge
                key={e}
                variant="outline"
                className={cn(
                  cls.bg,
                  cls.text,
                  cls.border,
                  "gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                )}
              >
                <span aria-hidden>
                  {ENVIRONMENT_EMOJI[e as Environment]}
                </span>
                {e}
              </Badge>
            );
          })}
        </div>

        {/* Pokemon */}
        <div className="flex flex-wrap gap-1.5">
          {cell.pokemon.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p)}
              className="pkp-lift inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-1.5 py-0.5 text-[11px]"
              title={p.name}
            >
              <PokemonIcon pokemon={p} size={20} />
              <span className="truncate">{p.name}</span>
            </button>
          ))}
        </div>

        {/* Private zone items */}
        {privateZone ? (
          <ZoneBlock
            zone={privateZone}
            title="私有区"
            subtitle="只有本格子的宝可梦享用"
            tone="peach"
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

// --------------------------------------------------------------------------
// Overlap card
// --------------------------------------------------------------------------

function OverlapCard({ zone }: { zone: Zone }) {
  return (
    <div className="flex shrink-0 items-center justify-center lg:w-48">
      <Card className="w-full rounded-3xl border-pkp-mint-ink/20 bg-pkp-mint/40 shadow-sm">
        <CardContent className="flex flex-col gap-2 p-3">
          <header className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-pkp-mint-ink">
              重叠区
            </span>
            <ArrowRight className="size-3 text-pkp-mint-ink/70" strokeWidth={1.75} />
          </header>
          <span className="text-[11px] text-pkp-mint-ink/80">
            {zone.beneficiaries.length} 只共享 · 最高效
          </span>
          <ZoneBlock
            zone={zone}
            title=""
            subtitle=""
            tone="mint"
            dense
          />
        </CardContent>
      </Card>
    </div>
  );
}

// --------------------------------------------------------------------------
// Zone block (item suggestions)
// --------------------------------------------------------------------------

function ZoneBlock({
  zone,
  title,
  subtitle,
  tone,
  dense,
}: {
  zone: Zone;
  title: string;
  subtitle: string;
  tone: "peach" | "mint";
  dense?: boolean;
}) {
  const cls = tone === "peach"
    ? "border-pkp-peach-ink/20 bg-pkp-peach text-pkp-peach-ink"
    : "border-pkp-mint-ink/20 bg-pkp-mint text-pkp-mint-ink";

  if (zone.suggestions.length === 0) {
    return (
      <div className={cn(
        "rounded-2xl border border-dashed border-border/60 px-2 py-1.5 text-[10px] text-muted-foreground",
        dense ? "" : "bg-muted/30"
      )}>
        {dense ? "无需额外物品" : "（无建议物品）"}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", dense ? "" : "rounded-2xl border border-dashed border-border/60 bg-muted/30 p-2")}>
      {title ? (
        <div className="flex items-center gap-1.5">
          <Package className="size-3 text-muted-foreground" strokeWidth={1.75} />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {title}
          </span>
          <span className="text-[10px] text-muted-foreground">· {subtitle}</span>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-1">
        {zone.suggestions.map((s) => (
          <Badge
            key={s.item}
            variant="outline"
            className={cn(
              cls,
              "gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            )}
          >
            {s.item}
            <span className="ml-0.5 font-mono text-[10px] opacity-70">
              ×{s.covers}
            </span>
          </Badge>
        ))}
      </div>
    </div>
  );
}

void Sparkles; // keep import stable
