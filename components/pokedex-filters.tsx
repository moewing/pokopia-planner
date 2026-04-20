"use client";

import { useMemo } from "react";
import { Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CONSTANTS } from "@/lib/data";
import { useAllPokemon } from "@/store/overrides-store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  ENVIRONMENT_CLASSES,
  ENVIRONMENT_EMOJI,
  SPECIALTIES,
  TASTES,
  TASTE_EMOJI,
  type Environment,
  type Specialty,
  type Taste,
} from "@/types/pokemon";

/** Grouping of specialties so filters feel semantic, not alphabetical. */
type SpecialtyGroupKey = "cycle" | "function" | "action" | "atmosphere";
const SPECIALTY_GROUPS: Array<{ key: SpecialtyGroupKey; items: Specialty[] }> = [
  { key: "cycle", items: ["乱撒", "分类", "伐木", "点火", "回收利用"] },
  {
    key: "function",
    items: [
      "栽培",
      "滋润",
      "建造",
      "工匠",
      "彩绘",
      "鉴定",
      "收藏家",
      "收纳",
      "稀有物",
      "采蜜",
    ],
  },
  {
    key: "action",
    items: [
      "飞翔",
      "瞬间移动",
      "碾压",
      "重踏",
      "找东西",
      "交易",
      "变身",
      "发电",
      "发光",
      "爆炸",
    ],
  },
  {
    key: "atmosphere",
    items: ["带动气氛", "DJ", "开派对", "梦岛", "哈欠", "贪吃鬼", "不明"],
  },
];

// sanity check at dev-time that the grouping covers all 32 specialties
if (process.env.NODE_ENV !== "production") {
  const all = new Set<Specialty>(SPECIALTIES);
  const grouped = new Set(SPECIALTY_GROUPS.flatMap((g) => g.items));
  for (const s of all)
    if (!grouped.has(s)) console.warn("specialty missing from filter groups:", s);
}

export interface PokedexFilterState {
  query: string;
  envs: Set<Environment>;
  specialties: Set<string>;
  tastes: Set<Taste>;
  litteredItems: Set<string>;
  likes: Set<string>;
  hideNonPlayable: boolean;
}

export const emptyFilters = (): PokedexFilterState => ({
  query: "",
  envs: new Set(),
  specialties: new Set(),
  tastes: new Set(),
  litteredItems: new Set(),
  likes: new Set(),
  hideNonPlayable: false,
});

export function filterCount(state: PokedexFilterState): number {
  return (
    (state.query ? 1 : 0) +
    state.envs.size +
    state.specialties.size +
    state.tastes.size +
    state.litteredItems.size +
    state.likes.size +
    (state.hideNonPlayable ? 1 : 0)
  );
}

interface Props {
  state: PokedexFilterState;
  setState: (update: Partial<PokedexFilterState>) => void;
  reset: () => void;
  resultCount: number;
}

export function PokedexFilters({ state, setState, reset, resultCount }: Props) {
  const allPokemon = useAllPokemon();
  const { t, translateEnv, translateTaste, translateSpecialty, translateLitteredItem } = useT();

  // Unique lists derived from the current (possibly-overridden) dataset
  const uniqueLittered = useMemo(() => {
    const set = new Set<string>();
    for (const p of allPokemon) for (const it of p.littered_items) set.add(it);
    return [...set].sort();
  }, [allPokemon]);

  const uniqueLikes = useMemo(() => {
    const set = new Set<string>();
    for (const p of allPokemon) for (const l of p.likes) set.add(l);
    return [...set].sort();
  }, [allPokemon]);

  const active = filterCount(state);

  const toggle = <T,>(setName: keyof PokedexFilterState, value: T) => {
    const set = new Set(state[setName] as Set<T>);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    setState({ [setName]: set } as Partial<PokedexFilterState>);
  };

  return (
    <div className="flex h-full flex-col gap-5">
      {/* Search */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.75}
        />
        <Input
          placeholder={t("pokedex.searchPlaceholder")}
          value={state.query}
          onChange={(e) => setState({ query: e.target.value })}
          className="rounded-full pl-9"
        />
      </div>

      {/* Result count + reset */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          <span className="font-mono text-foreground">{resultCount}</span>{" "}
          {t("pokedex.matched")}
        </span>
        {active > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            className="h-7 gap-1 rounded-full px-2 text-xs text-muted-foreground"
          >
            <X className="size-3" strokeWidth={2} />
            {t("pokedex.clearFilters")}
          </Button>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="hide-non-playable"
          checked={state.hideNonPlayable}
          onCheckedChange={(v) =>
            setState({ hideNonPlayable: v === true })
          }
        />
        <Label
          htmlFor="hide-non-playable"
          className="cursor-pointer text-sm text-foreground/80"
        >
          {t("pokedex.hidenonPlayable")}
        </Label>
      </div>

      <Accordion
        defaultValue={["env", "specialty", "taste"]}
        className="flex flex-col gap-2"
      >
        {/* Environment */}
        <AccordionItem value="env" className="border-none">
          <AccordionTrigger className="rounded-xl px-2 py-1.5 text-sm hover:no-underline data-[state=open]:bg-muted/40">
            {t("pokedex.filterGroups.env")}
            {state.envs.size > 0 ? (
              <span className="ml-2 text-xs text-muted-foreground">
                · {state.envs.size}
              </span>
            ) : null}
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-1">
            <div className="flex flex-wrap gap-1.5">
              {CONSTANTS.environments.map((env) => {
                const cls = ENVIRONMENT_CLASSES[env];
                const active = state.envs.has(env);
                return (
                  <button
                    key={env}
                    type="button"
                    onClick={() => toggle<Environment>("envs", env)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                      active
                        ? `${cls.bg} ${cls.text} ${cls.border}`
                        : "border-border/60 bg-background text-foreground/70 hover:bg-muted/60",
                    )}
                  >
                    <span aria-hidden>{ENVIRONMENT_EMOJI[env]}</span>
                    {translateEnv(env)}
                  </button>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Specialty — grouped */}
        <AccordionItem value="specialty" className="border-none">
          <AccordionTrigger className="rounded-xl px-2 py-1.5 text-sm hover:no-underline data-[state=open]:bg-muted/40">
            {t("pokedex.filterGroups.specialty")}
            {state.specialties.size > 0 ? (
              <span className="ml-2 text-xs text-muted-foreground">
                · {state.specialties.size}
              </span>
            ) : null}
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3 pt-2 pb-1">
            {SPECIALTY_GROUPS.map((group) => (
              <div key={group.key} className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {t(`pokedex.specialtyGroups.${group.key}`)}
                </span>
                <div className="flex flex-wrap gap-1">
                  {group.items.map((s) => {
                    const active = state.specialties.has(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggle<string>("specialties", s)}
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/60 bg-background text-foreground/70 hover:bg-muted/60",
                        )}
                      >
                        {translateSpecialty(s)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        {/* Taste */}
        <AccordionItem value="taste" className="border-none">
          <AccordionTrigger className="rounded-xl px-2 py-1.5 text-sm hover:no-underline data-[state=open]:bg-muted/40">
            {t("pokedex.filterGroups.taste")}
            {state.tastes.size > 0 ? (
              <span className="ml-2 text-xs text-muted-foreground">
                · {state.tastes.size}
              </span>
            ) : null}
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-1">
            <div className="flex flex-wrap gap-1.5">
              {TASTES.map((ts) => {
                const active = state.tastes.has(ts);
                return (
                  <button
                    key={ts}
                    type="button"
                    onClick={() => toggle<Taste>("tastes", ts)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-background text-foreground/70 hover:bg-muted/60",
                    )}
                  >
                    <span aria-hidden>{TASTE_EMOJI[ts]}</span>
                    {translateTaste(ts)}
                  </button>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Littered items */}
        <AccordionItem value="littered" className="border-none">
          <AccordionTrigger className="rounded-xl px-2 py-1.5 text-sm hover:no-underline data-[state=open]:bg-muted/40">
            {t("pokedex.filterGroups.littered")}
            {state.litteredItems.size > 0 ? (
              <span className="ml-2 text-xs text-muted-foreground">
                · {state.litteredItems.size}
              </span>
            ) : null}
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-1">
            <div className="flex flex-wrap gap-1">
              {uniqueLittered.map((it) => {
                const active = state.litteredItems.has(it);
                return (
                  <button
                    key={it}
                    type="button"
                    onClick={() => toggle<string>("litteredItems", it)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                      active
                        ? "border-pkp-peach-ink/25 bg-pkp-peach text-pkp-peach-ink"
                        : "border-border/60 bg-background text-foreground/70 hover:bg-muted/60",
                    )}
                  >
                    {translateLitteredItem(it)}
                  </button>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Likes */}
        <AccordionItem value="likes" className="border-none">
          <AccordionTrigger className="rounded-xl px-2 py-1.5 text-sm hover:no-underline data-[state=open]:bg-muted/40">
            {t("pokedex.filterGroups.likes")}
            {state.likes.size > 0 ? (
              <span className="ml-2 text-xs text-muted-foreground">
                · {state.likes.size}
              </span>
            ) : null}
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-1">
            <div className="flex flex-wrap gap-1">
              {uniqueLikes.map((l) => {
                const active = state.likes.has(l);
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => toggle<string>("likes", l)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                      active
                        ? "border-pkp-mint-ink/25 bg-pkp-mint text-pkp-mint-ink"
                        : "border-border/60 bg-background text-foreground/70 hover:bg-muted/60",
                    )}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {active > 0 ? (
        <div className="flex flex-wrap gap-1 pt-2">
          <span className="text-[11px] text-muted-foreground">
            {t("pokedex.selectedPrefix")}
          </span>
          {[...state.envs].map((e) => (
            <Chip
              key={`e:${e}`}
              label={t("pokedex.removeFilter")}
              onRemove={() => toggle<Environment>("envs", e)}
            >
              {ENVIRONMENT_EMOJI[e]} {translateEnv(e)}
            </Chip>
          ))}
          {[...state.specialties].map((s) => (
            <Chip
              key={`s:${s}`}
              label={t("pokedex.removeFilter")}
              onRemove={() => toggle<string>("specialties", s)}
            >
              {translateSpecialty(s)}
            </Chip>
          ))}
          {[...state.tastes].map((ts) => (
            <Chip
              key={`t:${ts}`}
              label={t("pokedex.removeFilter")}
              onRemove={() => toggle<Taste>("tastes", ts)}
            >
              {TASTE_EMOJI[ts]} {translateTaste(ts)}
            </Chip>
          ))}
          {[...state.litteredItems].map((it) => (
            <Chip
              key={`i:${it}`}
              label={t("pokedex.removeFilter")}
              onRemove={() => toggle<string>("litteredItems", it)}
            >
              {translateLitteredItem(it)}
            </Chip>
          ))}
          {[...state.likes].map((l) => (
            <Chip
              key={`l:${l}`}
              label={t("pokedex.removeFilter")}
              onRemove={() => toggle<string>("likes", l)}
            >
              {l}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Chip({
  children,
  label,
  onRemove,
}: {
  children: React.ReactNode;
  label: string;
  onRemove: () => void;
}) {
  return (
    <Badge
      variant="outline"
      className="gap-1 rounded-full border-border/60 bg-background px-2 py-0.5 text-[11px] font-normal text-foreground/80"
    >
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 -mr-0.5 inline-flex size-3.5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        aria-label={label}
      >
        <X className="size-2.5" strokeWidth={2.5} />
      </button>
    </Badge>
  );
}
