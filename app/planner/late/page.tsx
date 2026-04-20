"use client";

import { useMemo, useState } from "react";
import { Heart, Sparkles, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PlannerSelector } from "@/components/planner-selector";
import { PokemonIcon } from "@/components/pokemon-icon";
import { PokemonDetail } from "@/components/pokemon-detail";
import {
  useLatePlannerStore,
  useSelectedPokemonFrom,
} from "@/store/planner-store";
import {
  commonOverlap,
  groupByAffinity,
  similarity,
  similarityMatrix,
} from "@/lib/similarity";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  ENVIRONMENT_CLASSES,
  ENVIRONMENT_EMOJI,
  type Environment,
  type Pokemon,
  type Taste,
} from "@/types/pokemon";

const MIN_SELECTION = 2;
const MAX_RECOMMENDED = 10;

export default function PlannerLatePage() {
  const selected = useSelectedPokemonFrom(useLatePlannerStore);
  const hasHydrated = useLatePlannerStore((s) => s.hasHydrated);
  const remove = useLatePlannerStore((s) => s.remove);
  const [detail, setDetail] = useState<Pokemon | null>(null);
  const { t } = useT();

  const matrix = useMemo(() => similarityMatrix(selected), [selected]);
  const groups = useMemo(
    () => groupByAffinity(selected, 6),
    [selected],
  );
  const avgScore = useMemo(() => {
    if (selected.length < 2) return null;
    let sum = 0;
    let n = 0;
    for (let i = 0; i < matrix.length; i++)
      for (let j = i + 1; j < matrix.length; j++) {
        const v = matrix[i][j];
        if (v != null) {
          sum += v;
          n += 1;
        }
      }
    return n === 0 ? 0 : Math.round(sum / n);
  }, [matrix, selected.length]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("plannerLate.eyebrow")}
          </span>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("plannerLate.title")}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("plannerLate.lead", { min: MIN_SELECTION, max: MAX_RECOMMENDED })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-full border-border/60 bg-background px-2.5 py-0.5 text-xs"
          >
            {t("plannerLate.selectedBadge", { n: selected.length })}
          </Badge>
          <PlannerSelector
            triggerLabel={t("plannerLate.adjustSelection")}
            triggerVariant="default"
            store={useLatePlannerStore}
            compact
            maxHint={MAX_RECOMMENDED}
          />
        </div>
      </header>

      {!hasHydrated ? null : selected.length < MIN_SELECTION ? (
        <EmptyCta />
      ) : (
        <>
          {avgScore != null ? <MetricsCard avgScore={avgScore} count={selected.length} /> : null}

          {/* Selection chips w/ remove */}
          <Card className="rounded-3xl border-border/60 bg-card/60 shadow-none">
            <CardContent className="flex flex-wrap gap-2 p-4">
              {selected.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => remove(p.id)}
                  className="pkp-lift flex items-center gap-2 rounded-full border border-border/60 bg-background px-2 py-1 text-xs"
                  title={t("plannerLate.removeHint", { id: p.id, name: p.name })}
                >
                  <PokemonIcon pokemon={p} size={24} />
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground">✕</span>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Matrix */}
          <SimilarityMatrix
            list={selected}
            matrix={matrix}
            onPick={setDetail}
          />

          {/* Groups */}
          <section className="flex flex-col gap-3">
            <header className="flex items-end justify-between">
              <h2 className="text-lg font-semibold">
                {t("plannerLate.groupsTitle")}
              </h2>
              <span className="text-xs text-muted-foreground">
                {t("plannerLate.groupsHint")}
              </span>
            </header>
            <div className="grid items-start gap-4 lg:grid-cols-2">
              {groups.map((g, i) => (
                <GroupCard
                  key={i}
                  index={i}
                  group={g}
                  onPick={setDetail}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <PokemonDetail
        pokemon={detail}
        onOpenChange={(o) => !o && setDetail(null)}
        onSelect={(p) => setDetail(p)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty CTA
// ---------------------------------------------------------------------------

function EmptyCta() {
  const { t } = useT();
  return (
    <Card className="rounded-3xl border-dashed border-border/60 bg-card/60 shadow-none">
      <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-3xl bg-pkp-pink text-pkp-pink-ink">
          <Heart className="size-7" strokeWidth={1.5} />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-semibold">
            {t("plannerLate.emptyTitle")}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {t("plannerLate.emptyBody")}
          </p>
        </div>
        <PlannerSelector
          triggerLabel={t("plannerLate.selectorLabel")}
          triggerVariant="default"
          store={useLatePlannerStore}
          compact
          maxHint={MAX_RECOMMENDED}
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

function MetricsCard({
  avgScore,
  count,
}: {
  avgScore: number;
  count: number;
}) {
  const { t } = useT();
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Metric
        icon={Users}
        accent="bg-pkp-peach text-pkp-peach-ink"
        label={t("plannerLate.metrics.count")}
        value={`${count}`}
        hint={
          count > MAX_RECOMMENDED
            ? t("plannerLate.metrics.countOver", { max: MAX_RECOMMENDED })
            : t("plannerLate.metrics.countHint")
        }
      />
      <Metric
        icon={Heart}
        accent="bg-pkp-pink text-pkp-pink-ink"
        label={t("plannerLate.metrics.avgScore")}
        value={`${avgScore}`}
        hint={
          avgScore >= 70
            ? t("plannerLate.metrics.avgVeryHigh")
            : avgScore >= 40
              ? t("plannerLate.metrics.avgMid")
              : t("plannerLate.metrics.avgLow")
        }
      />
      <Metric
        icon={Sparkles}
        accent="bg-pkp-mint text-pkp-mint-ink"
        label={t("plannerLate.metrics.formulaLabel")}
        value={t("plannerLate.metrics.formulaValue")}
        hint={t("plannerLate.metrics.formulaHint")}
      />
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <Card className="rounded-3xl border-border/60 bg-card shadow-sm">
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
          <span className="truncate font-semibold leading-tight">{value}</span>
          <span className="truncate text-[11px] text-muted-foreground">
            {hint}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Similarity matrix
// ---------------------------------------------------------------------------

function SimilarityMatrix({
  list,
  matrix,
  onPick,
}: {
  list: Pokemon[];
  matrix: Array<Array<number | null>>;
  onPick: (p: Pokemon) => void;
}) {
  const { t } = useT();
  if (list.length < 2) return null;

  return (
    <Card className="overflow-hidden rounded-3xl border-border/60 bg-card shadow-sm">
      <CardContent className="flex flex-col gap-3 p-5 sm:p-6">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {t("plannerLate.matrixEyebrow")}
            </span>
            <h2 className="text-lg font-semibold">
              {t("plannerLate.matrixTitle")}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <ScoreSwatch level="high">
              {t("plannerLate.matrixLegend.high")}
            </ScoreSwatch>
            <ScoreSwatch level="mid">
              {t("plannerLate.matrixLegend.mid")}
            </ScoreSwatch>
            <ScoreSwatch level="low">
              {t("plannerLate.matrixLegend.low")}
            </ScoreSwatch>
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="min-w-max border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th className="w-10" />
                {list.map((p) => (
                  <th key={p.id} className="w-10 align-bottom">
                    <button
                      type="button"
                      onClick={() => onPick(p)}
                      className="flex flex-col items-center gap-1 rounded-lg p-1 hover:bg-muted/40"
                      title={p.name}
                    >
                      <PokemonIcon pokemon={p} size={28} />
                      <span className="font-mono text-[9px] text-muted-foreground">
                        #{String(p.id).padStart(3, "0")}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((row, i) => (
                <tr key={row.id}>
                  <th className="pr-2 text-right align-middle">
                    <button
                      type="button"
                      onClick={() => onPick(row)}
                      className="flex items-center gap-1 rounded-lg p-1 hover:bg-muted/40"
                      title={row.name}
                    >
                      <PokemonIcon pokemon={row} size={24} />
                      <span className="truncate text-xs font-medium">
                        {row.name}
                      </span>
                    </button>
                  </th>
                  {list.map((_, j) => {
                    const v = matrix[i][j];
                    return (
                      <td key={j} className="p-0">
                        <ScoreCell
                          value={v}
                          self={i === j}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreCell({
  value,
  self,
}: {
  value: number | null;
  self: boolean;
}) {
  const { t } = useT();
  if (self)
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/40 text-[10px] text-muted-foreground">
        —
      </div>
    );
  if (value === null)
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/20 text-[10px] text-muted-foreground">
        n/a
      </div>
    );
  const level = value >= 70 ? "high" : value >= 40 ? "mid" : "low";
  const cls = {
    high: "bg-pkp-mint text-pkp-mint-ink",
    mid: "bg-pkp-yellow text-pkp-yellow-ink",
    low: "bg-pkp-peach/50 text-pkp-peach-ink",
  }[level];
  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg font-mono text-[11px] font-medium",
        cls,
      )}
      title={`${value}${t("detail.scoreSuffix")}`}
    >
      {value}
    </div>
  );
}

function ScoreSwatch({
  children,
  level,
}: {
  children: React.ReactNode;
  level: "high" | "mid" | "low";
}) {
  const cls = {
    high: "bg-pkp-mint",
    mid: "bg-pkp-yellow",
    low: "bg-pkp-peach/50",
  }[level];
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn(cls, "inline-block size-2.5 rounded-sm")} />
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Group card
// ---------------------------------------------------------------------------

function GroupCard({
  group,
  index,
  onPick,
}: {
  group: Pokemon[];
  index: number;
  onPick: (p: Pokemon) => void;
}) {
  const { t, translateEnv, translateTaste } = useT();
  const overlap = useMemo(() => commonOverlap(group), [group]);
  const avgInner = useMemo(() => {
    if (group.length < 2) return null;
    let sum = 0;
    let n = 0;
    for (let i = 0; i < group.length; i++)
      for (let j = i + 1; j < group.length; j++) {
        const v = similarity(group[i], group[j]) ?? 0;
        sum += v;
        n += 1;
      }
    return n === 0 ? 0 : Math.round(sum / n);
  }, [group]);

  const envList = overlap.envs as Environment[];
  const letter = String.fromCharCode(65 + index);

  return (
    <Card className="rounded-3xl border-border/60 bg-card shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-muted text-xs font-semibold">
              {letter}
            </span>
            <div className="flex flex-col">
              <span className="font-semibold">
                {t("plannerLate.group.title", { letter })}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {avgInner != null
                  ? t("plannerLate.group.inner", {
                      n: group.length,
                      avg: avgInner,
                    })
                  : t("plannerLate.group.innerSingle")}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {envList.map((e) => {
              const cls = ENVIRONMENT_CLASSES[e];
              return (
                <Badge
                  key={e}
                  variant="outline"
                  className={cn(
                    cls.bg,
                    cls.text,
                    cls.border,
                    "gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                  )}
                >
                  <span aria-hidden>{ENVIRONMENT_EMOJI[e]}</span>
                  {translateEnv(e)}
                </Badge>
              );
            })}
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {group.map((p) => (
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

        {overlap.tastes.length > 0 ? (
          <div className="flex items-start gap-2">
            <span className="shrink-0 text-[11px] uppercase tracking-widest text-muted-foreground">
              {t("plannerLate.group.commonTastes")}
            </span>
            <div className="flex flex-wrap gap-1">
              {overlap.tastes.map((ts) => (
                <Badge
                  key={ts}
                  variant="outline"
                  className="rounded-full border-border/60 bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {translateTaste(ts as Taste)}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {overlap.likes.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {t("plannerLate.group.commonLikes")}
            </span>
            <div className="flex flex-wrap gap-1">
              {overlap.likes.slice(0, 12).map((l) => (
                <Badge
                  key={l.item}
                  variant="outline"
                  className="rounded-full border-pkp-mint-ink/20 bg-pkp-mint px-2 py-0.5 text-[11px] text-pkp-mint-ink"
                >
                  {l.item}
                  <span className="ml-1 font-mono text-[10px] opacity-70">
                    ×{l.count}
                  </span>
                </Badge>
              ))}
              {overlap.likes.length > 12 ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-border/60 bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  +{overlap.likes.length - 12}
                </Badge>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
