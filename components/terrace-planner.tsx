"use client";

import { Fragment, useMemo, useState } from "react";
import { ArrowRight, MapPin, Package, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PokemonIcon } from "@/components/pokemon-icon";
import { useSelectedPokemon } from "@/store/planner-store";
import {
  planTerrace,
  type CellLayout,
  type UnhousedRecord,
  type Zone,
} from "@/lib/terrace";
import { useT } from "@/lib/i18n";
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
  const { t } = useT();

  const layout = useMemo(() => planTerrace(selected), [selected]);

  if (selected.length === 0) {
    return (
      <Card className="rounded-3xl border-dashed border-border/60 bg-card/60 shadow-none">
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          {t("manual.empty")}
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
              {t("terrace.mapLabel")}
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
              label={t("terrace.stats.pokemon")}
              value={`${layout.stats.pokemon}`}
              hint={t("terrace.stats.pokemonHint", { n: layout.cells.length })}
            />
            <StatCell
              label={t("terrace.stats.envs")}
              value={`${layout.stats.envsRepresented}`}
              hint={t("terrace.stats.envsHint")}
            />
            <StatCell
              label={t("terrace.stats.likes")}
              value={`${layout.stats.likesCovered}`}
              hint={t("terrace.stats.likesHint")}
            />
            <StatCell
              label={t("terrace.stats.satisfaction")}
              value={`${Math.round(layout.stats.avgLikeSatisfaction * 100)}%`}
              hint={t("terrace.stats.satisfactionHint")}
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

      {/* Unhoused — split by reason */}
      {layout.unhoused.length > 0 ? (
        <UnhousedSection unhoused={layout.unhoused} onPick={onPick} />
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
  const { t, translateEnv } = useT();
  const letter = String.fromCharCode(65 + cell.index);
  return (
    <Card className="flex-1 rounded-3xl border-border/60 bg-card shadow-sm lg:min-w-0">
      <CardContent className="flex flex-col gap-3 p-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-2xl bg-muted text-xs font-semibold">
              {letter}
            </span>
            <span className="text-sm font-semibold">
              {t("terrace.cell.title", { letter })}
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            {t("terrace.cell.sizeLabel", {
              cur: cell.pokemon.length,
              max: 6,
            })}
          </span>
        </header>

        {/* Env stack */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {t("terrace.cell.envLabel")}
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
                {translateEnv(e as Environment)}
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
            title={t("terrace.cell.privateZone")}
            subtitle={t("terrace.cell.privateSubtitle")}
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
  const { t } = useT();
  return (
    <div className="flex shrink-0 items-center justify-center lg:w-48">
      <Card className="w-full rounded-3xl border-pkp-mint-ink/20 bg-pkp-mint/40 shadow-sm">
        <CardContent className="flex flex-col gap-2 p-3">
          <header className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-pkp-mint-ink">
              {t("terrace.overlap.eyebrow")}
            </span>
            <ArrowRight className="size-3 text-pkp-mint-ink/70" strokeWidth={1.75} />
          </header>
          <span className="text-[11px] text-pkp-mint-ink/80">
            {t("terrace.overlap.caption", { n: zone.beneficiaries.length })}
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
  const { t } = useT();
  const cls = tone === "peach"
    ? "border-pkp-peach-ink/20 bg-pkp-peach text-pkp-peach-ink"
    : "border-pkp-mint-ink/20 bg-pkp-mint text-pkp-mint-ink";

  if (zone.suggestions.length === 0) {
    return (
      <div className={cn(
        "rounded-2xl border border-dashed border-border/60 px-2 py-1.5 text-[10px] text-muted-foreground",
        dense ? "" : "bg-muted/30"
      )}>
        {dense ? t("terrace.overlap.noItems") : t("terrace.overlap.noItemsFull")}
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

// --------------------------------------------------------------------------
// Unhoused section — split by reason with actionable hints
// --------------------------------------------------------------------------

function UnhousedSection({
  unhoused,
  onPick,
}: {
  unhoused: UnhousedRecord[];
  onPick: (p: Pokemon) => void;
}) {
  const { t } = useT();
  const conflicts = unhoused.filter((u) => u.reason === "env_conflict");
  const fulls = unhoused.filter((u) => u.reason === "cell_full");

  return (
    <div className="flex flex-col gap-3">
      {conflicts.length > 0 ? (
        <Card className="rounded-3xl border-dashed border-destructive/40 bg-destructive/5 shadow-none">
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] uppercase tracking-widest text-destructive/80">
                {t("terrace.unhoused.conflictEyebrow", { n: conflicts.length })}
              </span>
              <h3 className="text-sm font-semibold text-destructive">
                {t("terrace.unhoused.conflictTitle")}
              </h3>
              <p className="text-[11px] text-destructive/70">
                {t("terrace.unhoused.conflictBody")}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {conflicts.map((u) => (
                <ConflictRow key={u.pokemon.id} record={u} onPick={onPick} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {fulls.length > 0 ? (
        <Card className="rounded-3xl border-dashed border-amber-400/40 bg-amber-50/40 shadow-none">
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] uppercase tracking-widest text-amber-700/80">
                {t("terrace.unhoused.fullEyebrow", { n: fulls.length })}
              </span>
              <h3 className="text-sm font-semibold text-amber-900/90">
                {t("terrace.unhoused.fullTitle")}
              </h3>
              <p className="text-[11px] text-amber-900/70">
                {t("terrace.unhoused.fullBody")}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {fulls.map((u) => (
                <FullRow key={u.pokemon.id} record={u} onPick={onPick} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ConflictRow({
  record,
  onPick,
}: {
  record: UnhousedRecord;
  onPick: (p: Pokemon) => void;
}) {
  const { t, translateEnv } = useT();
  const p = record.pokemon;
  const pEnv = p.env as Environment;
  const pCls = ENVIRONMENT_CLASSES[pEnv];
  const conflicting = record.conflictingEnvs ?? [];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-background px-3 py-2">
      <button
        type="button"
        onClick={() => onPick(p)}
        className="flex items-center gap-2 text-sm font-medium"
      >
        <PokemonIcon pokemon={p} size={28} />
        <span className="font-mono text-[10px] text-muted-foreground">
          #{String(p.id).padStart(3, "0")}
        </span>
        <span>{p.name}</span>
      </button>
      <div className="flex items-center gap-1 text-[11px]">
        <span className="text-muted-foreground">
          {t("terrace.unhoused.conflictRequire")}
        </span>
        <Badge
          variant="outline"
          className={cn(
            pCls.bg,
            pCls.text,
            pCls.border,
            "gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
          )}
        >
          <span aria-hidden>{ENVIRONMENT_EMOJI[pEnv]}</span>
          {translateEnv(pEnv)}
        </Badge>
        <span className="text-muted-foreground">
          {t("terrace.unhoused.conflictWith")}
        </span>
        {conflicting.map((e) => {
          const cls = ENVIRONMENT_CLASSES[e];
          return (
            <Badge
              key={e}
              variant="outline"
              className={cn(
                cls.bg,
                cls.text,
                cls.border,
                "gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium opacity-80",
              )}
            >
              <span aria-hidden>{ENVIRONMENT_EMOJI[e]}</span>
              {translateEnv(e)}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

function FullRow({
  record,
  onPick,
}: {
  record: UnhousedRecord;
  onPick: (p: Pokemon) => void;
}) {
  const { t, translateEnv } = useT();
  const p = record.pokemon;
  const pEnv = p.env as Environment;
  const pCls = ENVIRONMENT_CLASSES[pEnv];

  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-border/60 bg-background px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPick(p)}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <PokemonIcon pokemon={p} size={28} />
          <span className="font-mono text-[10px] text-muted-foreground">
            #{String(p.id).padStart(3, "0")}
          </span>
          <span>{p.name}</span>
        </button>
        <Badge
          variant="outline"
          className={cn(
            pCls.bg,
            pCls.text,
            pCls.border,
            "gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
          )}
        >
          <span aria-hidden>{ENVIRONMENT_EMOJI[pEnv]}</span>
          {translateEnv(pEnv)}
        </Badge>
        <span className="font-mono text-[10px] text-muted-foreground">
          {t("terrace.unhoused.efficiencyScore", {
            n: record.efficiencyScore,
          })}
        </span>
      </div>
      {record.likes.length > 0 ? (
        <div className="flex items-start gap-2">
          <span className="shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">
            {t("terrace.unhoused.likesLead")}
          </span>
          <div className="flex flex-wrap gap-1">
            {record.likes.map((l) => (
              <Badge
                key={l}
                variant="outline"
                className="rounded-full border-pkp-mint-ink/20 bg-pkp-mint px-2 py-0.5 text-[10px] text-pkp-mint-ink"
              >
                {l}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

void Sparkles; // keep import stable
