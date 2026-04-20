"use client";

import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import type { StoreApi, UseBoundStore } from "zustand";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PokemonIcon } from "@/components/pokemon-icon";
import { usePlayable } from "@/store/overrides-store";
import {
  usePlannerStore,
  type PlannerSelectionState,
} from "@/store/planner-store";
import { cn } from "@/lib/utils";
import {
  ENVIRONMENT_CLASSES,
  ENVIRONMENT_EMOJI,
  type Environment,
  type Pokemon,
} from "@/types/pokemon";

interface Props {
  triggerLabel?: string;
  triggerVariant?: "default" | "outline";
  /** Which planner store to drive. Defaults to early. */
  store?: UseBoundStore<StoreApi<PlannerSelectionState>>;
  /** When true, hide the "入门包 / 加满 287" shortcuts (for late planner where pool is small). */
  compact?: boolean;
  /** Max selection count (shown as hint, not enforced). */
  maxHint?: number;
}

/** Reusable pool selector sheet, driven by either planner store. */
export function PlannerSelector({
  triggerLabel = "调整选择",
  triggerVariant = "outline",
  store = usePlannerStore,
  compact = false,
  maxHint,
}: Props) {
  const selectedIds = store((s) => s.selectedIds);
  const toggle = store((s) => s.toggle);
  const clear = store((s) => s.clear);
  const addAllPlayable = store((s) => s.addAllPlayable);
  const addCycleStarterPack = store((s) => s.addCycleStarterPack);

  const [query, setQuery] = useState("");
  const [envFilter, setEnvFilter] = useState<Environment | null>(null);

  const playable = usePlayable();
  const filtered = useMemo(() => {
    return playable.filter((p) => {
      if (envFilter && p.env !== envFilter) return false;
      if (query) {
        const q = query.trim();
        if (/^\d+$/.test(q)) {
          if (p.id !== Number(q)) return false;
        } else {
          const qLow = q.toLowerCase();
          const hit =
            p.name.includes(q) ||
            (p.name_tw?.includes(q) ?? false) ||
            p.specialties.some((s) => s.includes(q)) ||
            p.specialties_en.some((s) => s.toLowerCase().includes(qLow)) ||
            p.likes.some((l) => l.includes(q));
          if (!hit) return false;
        }
      }
      return true;
    });
  }, [playable, query, envFilter]);

  const selectedSet = new Set(selectedIds);

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant={triggerVariant}
            size="sm"
            className="gap-2 rounded-full"
          />
        }
      >
        <Plus className="size-4" strokeWidth={1.75} />
        {triggerLabel}
        {selectedIds.length > 0 ? (
          <span className="font-mono text-xs">· {selectedIds.length}</span>
        ) : null}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-4 overflow-hidden border-border/60 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/60 p-5 pb-4">
          <SheetTitle>选择宝可梦</SheetTitle>
          {!compact ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={addCycleStarterPack}
                className="rounded-full text-xs"
              >
                循环入门 10 只
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={addAllPlayable}
                className="rounded-full text-xs"
              >
                加满 287 只
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={clear}
                className="rounded-full text-xs text-muted-foreground"
              >
                清空
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={clear}
                className="rounded-full text-xs text-muted-foreground"
              >
                清空
              </Button>
            </div>
          )}
        </SheetHeader>

        <div className="flex flex-col gap-3 px-5">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.75}
            />
            <Input
              placeholder="搜索名字 / 编号 / 特长"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-full pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setEnvFilter(null)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                !envFilter
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-background text-foreground/70 hover:bg-muted/60",
              )}
            >
              全部
            </button>
            {(Object.keys(ENVIRONMENT_CLASSES) as Environment[]).map((e) => {
              const cls = ENVIRONMENT_CLASSES[e];
              const active = envFilter === e;
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEnvFilter(envFilter === e ? null : e)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                    active
                      ? `${cls.bg} ${cls.text} ${cls.border}`
                      : "border-border/60 bg-background text-foreground/70 hover:bg-muted/60",
                  )}
                >
                  <span aria-hidden>{ENVIRONMENT_EMOJI[e]}</span>
                  {e}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              <span className="font-mono text-foreground">{filtered.length}</span>
              {" · 已选 "}
              <span
                className={cn(
                  "font-mono",
                  maxHint && selectedIds.length > maxHint
                    ? "text-destructive"
                    : "text-foreground",
                )}
              >
                {selectedIds.length}
                {maxHint ? ` / ${maxHint}` : ""}
              </span>
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <ul className="flex flex-col gap-1">
            {filtered.map((p) => (
              <PoolRow
                key={p.id}
                pokemon={p}
                selected={selectedSet.has(p.id)}
                onToggle={() => toggle(p.id)}
              />
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PoolRow({
  pokemon,
  selected,
  onToggle,
}: {
  pokemon: Pokemon;
  selected: boolean;
  onToggle: () => void;
}) {
  const cls = pokemon.env
    ? ENVIRONMENT_CLASSES[pokemon.env as Environment]
    : null;
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border px-2 py-1.5 text-left transition-colors",
          selected
            ? "border-primary/40 bg-primary/5"
            : "border-border/60 hover:bg-muted/40",
        )}
      >
        <PokemonIcon pokemon={pokemon} size={40} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">
              {pokemon.name}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              #{String(pokemon.id).padStart(3, "0")}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {cls && pokemon.env ? (
              <span
                className={cn(
                  cls.bg,
                  cls.text,
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px]",
                )}
              >
                <span aria-hidden>
                  {ENVIRONMENT_EMOJI[pokemon.env as Environment]}
                </span>
                {pokemon.env}
              </span>
            ) : null}
            <span className="truncate">{pokemon.specialties.join(" / ")}</span>
          </span>
        </div>
        <div
          className={cn(
            "inline-flex size-5 shrink-0 items-center justify-center rounded-full border",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border",
          )}
        >
          {selected ? <X className="size-3" strokeWidth={3} /> : null}
        </div>
      </button>
    </li>
  );
}
