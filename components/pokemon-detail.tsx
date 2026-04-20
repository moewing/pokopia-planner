"use client";

import { useMemo } from "react";
import { Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { PokemonIcon } from "@/components/pokemon-icon";
import { tasteToArray } from "@/lib/data";
import { usePlayable } from "@/store/overrides-store";
import { rolesFor } from "@/lib/cycles";
import { similarity } from "@/lib/similarity";
import { cn } from "@/lib/utils";
import {
  ENVIRONMENT_CLASSES,
  ENVIRONMENT_EMOJI,
  TASTE_EMOJI,
  type Environment,
  type Pokemon,
  type Taste,
} from "@/types/pokemon";

interface Props {
  pokemon: Pokemon | null;
  onOpenChange: (open: boolean) => void;
  onSelect?: (pokemon: Pokemon) => void;
}

/**
 * Detail dialog. Shows all fields plus two relationship panes:
 *   1. "组循环搭档" — pokemon in pool that fill complementary cycle roles for this one
 *   2. "气味相投 Top 10" — highest similarity() matches (always same env by rule)
 */
export function PokemonDetail({ pokemon, onOpenChange, onSelect }: Props) {
  const playable = usePlayable();
  const related = useMemo(() => {
    if (!pokemon) return { cycleMates: [] as Pokemon[], similar: [] as Array<{ p: Pokemon; score: number }> };

    const myRoles = rolesFor(pokemon).cycle;

    // cycle mates: other playable pokemon whose roles complement this one's cycle set
    const myCycles = new Set<string>();
    for (const r of myRoles) {
      if (r.startsWith("litter_") || r === "gather") myCycles.add(r.replace("litter_", "").replace("gather", "any"));
      if (r.startsWith("process_")) myCycles.add(r.replace("process_", ""));
    }
    const cycleMates = pokemon.is_playable
      ? playable
          .filter((p) => p.id !== pokemon.id)
          .filter((p) => {
            const theirs = rolesFor(p).cycle;
            // intersects this pokemon's cycle membership
            if (myRoles.has("litter_wood") || myRoles.has("process_wood"))
              if (
                theirs.has("gather") ||
                theirs.has("litter_wood") ||
                theirs.has("process_wood")
              )
                return true;
            if (myRoles.has("litter_brick") || myRoles.has("process_brick"))
              if (
                theirs.has("gather") ||
                theirs.has("litter_brick") ||
                theirs.has("process_brick")
              )
                return true;
            if (
              myRoles.has("litter_iron") ||
              myRoles.has("process_iron") ||
              myRoles.has("process_recycle")
            )
              if (
                theirs.has("gather") ||
                theirs.has("litter_iron") ||
                theirs.has("process_iron") ||
                theirs.has("process_recycle")
              )
                return true;
            if (myRoles.has("gather"))
              if (
                theirs.has("litter_wood") ||
                theirs.has("litter_brick") ||
                theirs.has("litter_iron") ||
                theirs.has("process_wood") ||
                theirs.has("process_brick") ||
                theirs.has("process_iron") ||
                theirs.has("process_recycle")
              )
                return true;
            return false;
          })
          .slice(0, 12)
      : [];

    // similarity top 10 (excludes self and non-playable via null)
    const scored = playable
      .filter((p) => p.id !== pokemon.id)
      .map((p) => ({ p, score: similarity(pokemon, p) ?? -1 }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return { cycleMates, similar: scored };
  }, [pokemon, playable]);

  if (!pokemon) return null;
  const envCls = pokemon.env
    ? ENVIRONMENT_CLASSES[pokemon.env as Environment]
    : null;
  const tastes = tasteToArray(pokemon.taste);
  const open = !!pokemon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-3xl border-border/60 bg-card p-0 sm:max-w-3xl"
        style={{ maxHeight: "min(85vh, 760px)" }}
      >
        <ScrollArea className="max-h-[min(85vh,760px)]">
          <div className="flex flex-col gap-6 p-6 sm:p-8">
            <DialogHeader className="gap-2">
              <div className="flex items-start gap-5">
                <div className="shrink-0 rounded-2xl bg-muted/40 p-3">
                  <PokemonIcon pokemon={pokemon} size={112} priority />
                </div>
                <div className="flex flex-1 flex-col gap-1.5 pt-1">
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    #{String(pokemon.id).padStart(3, "0")}
                  </span>
                  <DialogTitle className="text-2xl leading-tight">
                    {pokemon.name}
                    {pokemon.name_tw && pokemon.name_tw !== pokemon.name ? (
                      <span className="ml-2 text-base font-normal text-muted-foreground">
                        {pokemon.name_tw}
                      </span>
                    ) : null}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    {pokemon.name} 的详细信息
                  </DialogDescription>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {envCls && pokemon.env ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          envCls.bg,
                          envCls.text,
                          envCls.border,
                          "gap-1 rounded-full border px-2.5 py-0.5 text-xs",
                        )}
                      >
                        <span aria-hidden>
                          {ENVIRONMENT_EMOJI[pokemon.env as Environment]}
                        </span>
                        {pokemon.env}
                      </Badge>
                    ) : null}
                    {tastes.map((t) => (
                      <Badge
                        key={t}
                        variant="outline"
                        className="gap-1 rounded-full border-border/60 bg-muted/60 px-2.5 py-0.5 text-xs text-muted-foreground"
                      >
                        <span aria-hidden>{TASTE_EMOJI[t]}</span>
                        {t}
                      </Badge>
                    ))}
                    {!pokemon.is_playable && (
                      <Badge
                        variant="outline"
                        className="gap-1 rounded-full border-border/60 bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                      >
                        <Lock className="size-3" strokeWidth={2} />
                        不可入住
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <Separator className="bg-border/60" />

            <section className="grid gap-5 sm:grid-cols-2">
              <Field label="特长">
                <div className="flex flex-wrap gap-1.5">
                  {pokemon.specialties.map((s, i) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className="rounded-full border-border/60 bg-background px-2.5 py-0.5 text-xs"
                    >
                      {s}
                      <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                        {pokemon.specialties_en[i]}
                      </span>
                    </Badge>
                  ))}
                </div>
              </Field>
              {pokemon.littered_items.length > 0 ? (
                <Field label="乱撒物">
                  <div className="flex flex-wrap gap-1.5">
                    {pokemon.littered_items.map((it) => (
                      <Badge
                        key={it}
                        variant="outline"
                        className="rounded-full border-pkp-peach-ink/15 bg-pkp-peach px-2.5 py-0.5 text-xs text-pkp-peach-ink"
                      >
                        {it}
                      </Badge>
                    ))}
                  </div>
                </Field>
              ) : null}
              {pokemon.likes.length > 0 ? (
                <Field label="喜欢事物" className="sm:col-span-2">
                  <div className="flex flex-wrap gap-1.5">
                    {pokemon.likes.map((l) => (
                      <Badge
                        key={l}
                        variant="outline"
                        className="rounded-full border-pkp-mint-ink/15 bg-pkp-mint px-2.5 py-0.5 text-xs text-pkp-mint-ink"
                      >
                        {l}
                      </Badge>
                    ))}
                  </div>
                </Field>
              ) : null}
              {pokemon.type && pokemon.type.length > 0 ? (
                <Field label="属性">
                  <div className="flex flex-wrap gap-1.5">
                    {pokemon.type.map((t) => (
                      <Badge
                        key={t}
                        variant="outline"
                        className="rounded-full border-border/60 bg-background px-2.5 py-0.5 text-xs"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                </Field>
              ) : null}
              {pokemon.habitats.length > 0 ? (
                <Field label="推荐栖息地">
                  <div className="flex flex-wrap gap-1.5">
                    {pokemon.habitats.map((h) => (
                      <Badge
                        key={h}
                        variant="outline"
                        className="rounded-full border-border/60 bg-background px-2.5 py-0.5 text-xs"
                      >
                        {h}
                      </Badge>
                    ))}
                  </div>
                </Field>
              ) : null}
              {pokemon.notes.length > 0 ? (
                <Field label="备注" className="sm:col-span-2">
                  <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                    {pokemon.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </Field>
              ) : null}
            </section>

            {related.cycleMates.length > 0 ? (
              <>
                <Separator className="bg-border/60" />
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">
                    可以和它组资源循环的宝可梦
                  </h3>
                  <MiniList list={related.cycleMates} onSelect={onSelect} />
                </section>
              </>
            ) : null}

            {related.similar.length > 0 ? (
              <>
                <Separator className="bg-border/60" />
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">
                    气味相投 Top {related.similar.length}
                  </h3>
                  <MiniList
                    list={related.similar.map((x) => x.p)}
                    scores={related.similar.map((x) => x.score)}
                    onSelect={onSelect}
                  />
                </section>
              </>
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

function MiniList({
  list,
  scores,
  onSelect,
}: {
  list: Pokemon[];
  scores?: number[];
  onSelect?: (p: Pokemon) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {list.map((p, idx) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect?.(p)}
          className="pkp-lift flex items-center gap-2 rounded-2xl border border-border/60 bg-background p-2 text-left"
        >
          <PokemonIcon pokemon={p} size={40} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{p.name}</span>
            <span className="text-[10px] font-mono text-muted-foreground">
              #{String(p.id).padStart(3, "0")}
              {scores && scores[idx] != null ? ` · ${scores[idx]}分` : ""}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
