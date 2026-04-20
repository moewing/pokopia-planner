"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Recycle, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PokemonCard } from "@/components/pokemon-card";
import { PokemonDetail } from "@/components/pokemon-detail";
import { PokemonIcon } from "@/components/pokemon-icon";
import { CONSTANTS } from "@/lib/data";
import { useAllPokemon, usePlayable } from "@/store/overrides-store";
import {
  CYCLE_META,
  CYCLE_REQUIREMENTS,
  analyzeCycles,
  recommendCycleTeam,
  rolesFor,
  teamEnvDistribution,
  type CycleRole,
} from "@/lib/cycles";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  ENVIRONMENT_CLASSES,
  ENVIRONMENT_EMOJI,
  type CycleId,
  type Environment,
  type Pokemon,
} from "@/types/pokemon";

const CYCLES: CycleId[] = ["wood_cycle", "brick_cycle", "iron_bar_cycle"];

const NON_CYCLE_LITTER_ITEMS = [
  "藤蔓绳",
  "线团",
  "棉花",
  "石头",
  "结实的树枝",
  "叶子",
  "铁",
  "甜甜蜜",
] as const;

const CYCLE_TO_I18N: Record<CycleId, "wood" | "brick" | "iron"> = {
  wood_cycle: "wood",
  brick_cycle: "brick",
  iron_bar_cycle: "iron",
};

export default function RecipesPage() {
  const playable = usePlayable();
  const { t } = useT();
  const report = useMemo(() => analyzeCycles(playable), [playable]);

  const [teams, setTeams] = useState<
    Partial<Record<CycleId, Pokemon[] | null>>
  >({});
  const [detail, setDetail] = useState<Pokemon | null>(null);

  const recommend = (id: CycleId) => {
    const team = recommendCycleTeam(id, playable);
    setTeams((t) => ({ ...t, [id]: team }));
  };

  const clearTeam = (id: CycleId) => {
    setTeams((t) => ({ ...t, [id]: undefined }));
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      {/* Hero */}
      <header className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Recipes
        </span>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("recipes.title")}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {t("recipes.lead")}
        </p>
      </header>

      {/* Three cycles */}
      <section className="grid items-start gap-4 xl:grid-cols-2">
        {CYCLES.map((id) => (
          <CycleCard
            key={id}
            cycleId={id}
            report={report[id]}
            team={teams[id] ?? null}
            onRecommend={() => recommend(id)}
            onClear={() => clearTeam(id)}
            onPick={setDetail}
          />
        ))}
      </section>

      {/* Paper one-shot */}
      <PaperCard report={report.paper} onPick={setDetail} />

      {/* Non-cycle litter */}
      <NonCycleLitterCard />

      <PokemonDetail
        pokemon={detail}
        onOpenChange={(o) => !o && setDetail(null)}
        onSelect={setDetail}
      />
    </div>
  );
}

// --------------------------------------------------------------------------
// Cycle card
// --------------------------------------------------------------------------

function CycleCard({
  cycleId,
  report,
  team,
  onRecommend,
  onClear,
  onPick,
}: {
  cycleId: CycleId;
  report: ReturnType<typeof analyzeCycles>[CycleId];
  team: Pokemon[] | null;
  onRecommend: () => void;
  onClear: () => void;
  onPick: (p: Pokemon) => void;
}) {
  const { t, locale } = useT();
  const meta = CYCLE_META[cycleId];
  const roles = CYCLE_REQUIREMENTS[cycleId];
  const cycleData = CONSTANTS.resource_cycles[cycleId];
  const cycleI18nKey = CYCLE_TO_I18N[cycleId];
  const cycleDisplayName =
    locale === "zh" ? meta.name : t(`cycles.${cycleI18nKey}`);

  return (
    <Card className="overflow-hidden rounded-3xl border-border/60 bg-card shadow-sm">
      <CardContent className="flex flex-col gap-6 p-6 sm:p-7">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                meta.accent,
                "inline-flex size-10 items-center justify-center rounded-2xl",
              )}
            >
              <Recycle className="size-5" strokeWidth={1.75} />
            </span>
            <div className="flex flex-col">
              <span className="font-semibold">{cycleDisplayName}</span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {cycleId.replace("_", " ")}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {cycleData.outputs.map((o) => (
              <span
                key={o}
                className="rounded-full bg-muted/60 px-2.5 py-1 font-medium"
              >
                {o}
              </span>
            ))}
          </div>
        </header>

        {/* Flow */}
        <CycleFlow
          roles={roles}
          staffing={report.staffing}
          team={team}
          onPick={onPick}
        />

        {/* Summary & actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {report.complete ? (
              <span>
                {t("recipes.complete", { n: totalCandidates(report.staffing) })}
              </span>
            ) : (
              <span className="text-destructive">
                {t("recipes.missingRoles", {
                  roles: report.missingRoles
                    .map((r) => t(`roles.${r}`))
                    .join(" / "),
                })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {team ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="rounded-full text-xs text-muted-foreground"
              >
                {t("recipes.clearTeam")}
              </Button>
            ) : null}
            <Button
              size="sm"
              onClick={onRecommend}
              disabled={!report.complete}
              className="rounded-full gap-1.5"
            >
              <Sparkles className="size-4" strokeWidth={1.75} />
              {t("recipes.recommend")}
            </Button>
          </div>
        </div>

        {team ? <TeamPreview team={team} onPick={onPick} /> : null}
      </CardContent>
    </Card>
  );
}

function totalCandidates(
  staffing: Record<CycleRole, Pokemon[]>,
): number {
  const seen = new Set<number>();
  for (const list of Object.values(staffing))
    for (const p of list) seen.add(p.id);
  return seen.size;
}

// --------------------------------------------------------------------------
// Flow diagram
// --------------------------------------------------------------------------

function CycleFlow({
  roles,
  staffing,
  team,
  onPick,
}: {
  roles: CycleRole[];
  staffing: Record<CycleRole, Pokemon[]>;
  team: Pokemon[] | null;
  onPick: (p: Pokemon) => void;
}) {
  return (
    <div className="flex flex-col gap-3 overflow-x-auto">
      <div className="flex min-w-max items-stretch gap-2">
        {roles.map((role, idx) => {
          const count = staffing[role].length;
          const picked = team?.find((p) => rolesFor(p).cycle.has(role)) ?? null;
          return (
            <div key={role} className="flex items-stretch gap-2">
              <RoleNode
                role={role}
                count={count}
                picked={picked}
                onPick={onPick}
              />
              {idx < roles.length - 1 ? (
                <div className="flex items-center self-stretch text-muted-foreground/60">
                  <ArrowRight className="size-4" strokeWidth={1.75} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoleNode({
  role,
  count,
  picked,
  onPick,
}: {
  role: CycleRole;
  count: number;
  picked: Pokemon | null;
  onPick: (p: Pokemon) => void;
}) {
  const { t } = useT();
  const ok = count > 0;
  const kind: "process" | "gather" | "litter" =
    role.split("_")[0] === "process"
      ? "process"
      : role === "gather"
        ? "gather"
        : "litter";
  return (
    <div
      className={cn(
        "flex w-40 flex-col gap-1.5 rounded-2xl border p-3 transition-colors",
        ok
          ? "border-border/60 bg-background"
          : "border-destructive/40 bg-destructive/5",
      )}
    >
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {t(`roleKind.${kind}`)}
      </span>
      <span className="text-sm font-medium leading-tight">
        {t(`roles.${role}`)}
      </span>
      <span className="text-[11px] text-muted-foreground">
        {t(`roleHints.${role}`)}
      </span>
      <div className="mt-auto flex items-center justify-between pt-1">
        <span
          className={cn(
            "font-mono text-[11px]",
            ok ? "text-muted-foreground" : "text-destructive",
          )}
        >
          {count > 0
            ? `${count} ${t("recipes.candidates")}`
            : t("recipes.noCandidates")}
        </span>
      </div>

      {picked ? (
        <button
          type="button"
          onClick={() => onPick(picked)}
          className="pkp-lift -mx-1 mt-1 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 p-1.5 text-left"
        >
          <PokemonIcon pokemon={picked} size={32} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-medium">
              {picked.name}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              #{String(picked.id).padStart(3, "0")}
            </span>
          </div>
        </button>
      ) : null}
    </div>
  );
}

// --------------------------------------------------------------------------
// Team preview (summary below flow)
// --------------------------------------------------------------------------

function TeamPreview({
  team,
  onPick,
}: {
  team: Pokemon[];
  onPick: (p: Pokemon) => void;
}) {
  const { t, translateEnv } = useT();
  const envDist = teamEnvDistribution(team);
  const envEntries = Object.entries(envDist).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground/80">
          {t("recipes.teamPreview", { n: team.length })}
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {envEntries.map(([env, n]) => {
            const cls = ENVIRONMENT_CLASSES[env as Environment];
            return (
              <Badge
                key={env}
                variant="outline"
                className={cn(
                  cls.bg,
                  cls.text,
                  cls.border,
                  "gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                )}
              >
                <span aria-hidden>{ENVIRONMENT_EMOJI[env as Environment]}</span>
                {translateEnv(env as Environment)} × {n}
              </Badge>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {team.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p)}
            className="pkp-lift flex items-center gap-2 rounded-2xl border border-border/60 bg-background p-2 text-left"
          >
            <PokemonIcon pokemon={p} size={36} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{p.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                #{String(p.id).padStart(3, "0")}
              </span>
            </div>
          </button>
        ))}
      </div>
      {envEntries.length > 1 ? (
        <p className="text-[11px] leading-5 text-muted-foreground">
          {t("recipes.envCrossNote", { n: envEntries.length })}
        </p>
      ) : null}
    </div>
  );
}

// --------------------------------------------------------------------------
// Paper one-shot card
// --------------------------------------------------------------------------

function PaperCard({
  report,
  onPick,
}: {
  report: ReturnType<typeof analyzeCycles>["paper"];
  onPick: (p: Pokemon) => void;
}) {
  const { t, locale } = useT();
  const meta = CONSTANTS.one_shot_processing.paper;
  const displayName = locale === "zh" ? meta.name_cn : t("cycles.paper");
  const sourceLocal =
    locale === "zh" ? meta.source : "Waste paper picked up in the world";
  const processorLocal =
    locale === "zh" ? meta.processor : t("roles.process_recycle");
  return (
    <Card className="overflow-hidden rounded-3xl border-border/60 bg-card shadow-sm">
      <CardContent className="flex flex-col gap-5 p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-pkp-lavender text-pkp-lavender-ink">
              <Sparkles className="size-5" strokeWidth={1.75} />
            </span>
            <div className="flex flex-col">
              <span className="font-semibold">{displayName}</span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {t("recipes.paperCard.oneShotSource")}
              </span>
            </div>
          </div>
          <span className="rounded-full bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
            {t("recipes.paperCard.sourceProcessor", {
              source: sourceLocal,
              processor: processorLocal,
            })}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            {report.doable
              ? t("recipes.paperCard.doable")
              : t("recipes.paperCard.notDoable")}
            {" · "}
            {t("recipes.paperCard.processorCount", { n: report.processors.length })}
          </span>
        </div>

        {report.processors.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {report.processors.slice(0, 8).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(p)}
                className="pkp-lift flex items-center gap-2 rounded-2xl border border-border/60 bg-background p-2 text-left"
              >
                <PokemonIcon pokemon={p} size={36} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    #{String(p.id).padStart(3, "0")}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// --------------------------------------------------------------------------
// Non-cycle litter — collect-only items
// --------------------------------------------------------------------------

function NonCycleLitterCard() {
  const { t, translateLitteredItem } = useT();
  const allPokemon = useAllPokemon();
  const tally = useMemo(() => {
    const map = new Map<string, Pokemon[]>();
    for (const item of NON_CYCLE_LITTER_ITEMS) map.set(item, []);
    for (const p of allPokemon) {
      if (!p.is_playable) continue;
      for (const it of p.littered_items) {
        if (map.has(it)) map.get(it)!.push(p);
      }
    }
    return [...map.entries()];
  }, [allPokemon]);

  return (
    <Card className="overflow-hidden rounded-3xl border-dashed border-border/60 bg-card/60 shadow-none">
      <CardContent className="flex flex-col gap-4 p-6 sm:p-7">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("recipes.nonCycle.eyebrow")}
          </span>
          <h2 className="text-lg font-semibold">
            {t("recipes.nonCycle.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("recipes.nonCycle.lead")}
          </p>
        </div>
        <Separator className="bg-border/60" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tally.map(([item, pokemons]) => (
            <div
              key={item}
              className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-background p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {translateLitteredItem(item)}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {t("recipes.nonCycle.count", { n: pokemons.length })}
                </span>
              </div>
              <div className="flex -space-x-2">
                {pokemons.slice(0, 4).map((p) => (
                  <PokemonIcon
                    key={p.id}
                    pokemon={p}
                    size={28}
                    className="rounded-full border-2 border-card bg-card"
                  />
                ))}
                {pokemons.length > 4 ? (
                  <span className="inline-flex size-7 items-center justify-center rounded-full border-2 border-card bg-muted/60 font-mono text-[10px] text-muted-foreground">
                    +{pokemons.length - 4}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Render basic pokemon card only when needed (currently imported to keep types clean)
void PokemonCard;
