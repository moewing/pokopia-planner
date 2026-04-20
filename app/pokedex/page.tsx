"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PokemonCard } from "@/components/pokemon-card";
import { PokemonDetail } from "@/components/pokemon-detail";
import {
  PokedexFilters,
  emptyFilters,
  filterCount,
  type PokedexFilterState,
} from "@/components/pokedex-filters";
import { tastesOverlap } from "@/lib/data";
import { useAllPokemon } from "@/store/overrides-store";
import type { Pokemon } from "@/types/pokemon";

function matches(p: Pokemon, f: PokedexFilterState): boolean {
  if (f.hideNonPlayable && !p.is_playable) return false;

  if (f.query) {
    const q = f.query.trim();
    if (/^\d+$/.test(q)) {
      if (p.id !== Number(q)) return false;
    } else {
      const qLow = q.toLowerCase();
      const hit =
        p.name.includes(q) ||
        (p.name_tw?.includes(q) ?? false) ||
        p.specialties.some((s) => s.includes(q)) ||
        p.specialties_en.some((s) => s.toLowerCase().includes(qLow)) ||
        p.likes.some((l) => l.includes(q)) ||
        p.littered_items.some((it) => it.includes(q));
      if (!hit) return false;
    }
  }
  if (f.envs.size > 0 && (!p.env || !f.envs.has(p.env))) return false;
  if (
    f.specialties.size > 0 &&
    !p.specialties.some((s) => f.specialties.has(s))
  )
    return false;
  if (f.tastes.size > 0) {
    const any = [...f.tastes].some((t) => tastesOverlap(p.taste, t));
    if (!any) return false;
  }
  if (
    f.litteredItems.size > 0 &&
    !p.littered_items.some((it) => f.litteredItems.has(it))
  )
    return false;
  if (f.likes.size > 0 && !p.likes.some((l) => f.likes.has(l))) return false;
  return true;
}

export default function PokedexPage() {
  const allPokemon = useAllPokemon();
  const [filters, setFilters] = useState<PokedexFilterState>(emptyFilters);
  const [open, setOpen] = useState<Pokemon | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const updateFilters = (patch: Partial<PokedexFilterState>) =>
    setFilters((f) => ({ ...f, ...patch }));

  const resetFilters = () => setFilters(emptyFilters());

  const filtered = useMemo(
    () =>
      allPokemon.filter((p) => matches(p, filters)).slice() as Pokemon[],
    [allPokemon, filters],
  );

  const activeCount = filterCount(filters);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:gap-10 lg:py-12">
      {/* Sidebar — desktop */}
      <aside className="hidden shrink-0 lg:block lg:w-72">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          <PokedexFilters
            state={filters}
            setState={updateFilters}
            reset={resetFilters}
            resultCount={filtered.length}
          />
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col gap-5">
        <header className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Pokédex
            </span>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              图鉴
            </h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono text-foreground">
                {filtered.length}
              </span>
              {" / "}
              <span className="font-mono">{allPokemon.length}</span> 只宝可梦
              · 点卡片查看详情
            </p>
          </div>

          {/* Filters button — mobile only */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-full lg:hidden"
                />
              }
            >
              <SlidersHorizontal className="size-4" strokeWidth={1.75} />
              筛选
              {activeCount > 0 ? (
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {activeCount}
                </span>
              ) : null}
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full max-w-sm overflow-y-auto border-border/60 p-6 sm:w-96"
            >
              <SheetHeader className="p-0 pb-4">
                <SheetTitle>筛选</SheetTitle>
              </SheetHeader>
              <PokedexFilters
                state={filters}
                setState={updateFilters}
                reset={resetFilters}
                resultCount={filtered.length}
              />
            </SheetContent>
          </Sheet>
        </header>

        {filtered.length === 0 ? (
          <EmptyState onReset={resetFilters} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
            {filtered.map((p) => (
              <PokemonCard
                key={p.id}
                pokemon={p}
                onClick={() => setOpen(p)}
              />
            ))}
          </div>
        )}
      </main>

      <PokemonDetail
        pokemon={open}
        onOpenChange={(o) => !o && setOpen(null)}
        onSelect={(p) => setOpen(p)}
      />
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border/60 bg-card/50 p-12 text-center">
      <span className="text-4xl" aria-hidden>
        🫧
      </span>
      <p className="text-sm text-muted-foreground">
        没有匹配的宝可梦。<br />
        试试减少几个筛选条件。
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        className="rounded-full"
      >
        清空筛选
      </Button>
    </div>
  );
}
