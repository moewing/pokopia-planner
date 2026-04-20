"use client";

import { Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PokemonIcon } from "@/components/pokemon-icon";
import { cn } from "@/lib/utils";
import {
  ENVIRONMENT_CLASSES,
  ENVIRONMENT_EMOJI,
  TASTE_EMOJI,
  type Environment,
  type Pokemon,
  type Taste,
} from "@/types/pokemon";

function tasteList(t: Pokemon["taste"]): Taste[] {
  if (!t) return [];
  return Array.isArray(t) ? (t as Taste[]) : [t as Taste];
}

/**
 * Grid card — large icon, number + name, env badge, taste, compact specialty chips.
 * Low-saturation pastel badges, quiet hover lift. Click handler lifted to parent.
 */
export function PokemonCard({
  pokemon,
  onClick,
  selected = false,
}: {
  pokemon: Pokemon;
  onClick?: () => void;
  selected?: boolean;
}) {
  const envCls = pokemon.env
    ? ENVIRONMENT_CLASSES[pokemon.env as Environment]
    : null;
  const tastes = tasteList(pokemon.taste);

  return (
    <Card
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "pkp-lift group relative cursor-pointer overflow-hidden rounded-3xl border-border/60 bg-card shadow-sm",
        selected && "ring-2 ring-primary/50",
      )}
    >
      <CardContent className="flex flex-col gap-3 p-5">
        {!pokemon.is_playable && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            <Lock className="size-3" strokeWidth={2} />
            不可入住
          </span>
        )}

        <div className="flex items-center justify-center py-2">
          <PokemonIcon pokemon={pokemon} size={96} />
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            #{String(pokemon.id).padStart(3, "0")}
          </span>
          <span className="font-semibold leading-tight">{pokemon.name}</span>
          {pokemon.name_tw && pokemon.name_tw !== pokemon.name ? (
            <span className="text-[11px] text-muted-foreground">
              {pokemon.name_tw}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {envCls && pokemon.env ? (
            <Badge
              variant="outline"
              className={cn(
                envCls.bg,
                envCls.text,
                envCls.border,
                "gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
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
              className="gap-1 rounded-full border-border/60 bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              <span aria-hidden>{TASTE_EMOJI[t]}</span>
              {t}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-1">
          {pokemon.specialties.slice(0, 3).map((s) => (
            <Badge
              key={s}
              variant="outline"
              className="rounded-full border-border/60 bg-background px-2 py-0.5 text-[10px] font-normal text-foreground/80"
            >
              {s}
            </Badge>
          ))}
          {pokemon.specialties.length > 3 ? (
            <Badge
              variant="outline"
              className="rounded-full border-border/60 bg-background px-2 py-0.5 text-[10px] font-normal text-muted-foreground"
            >
              +{pokemon.specialties.length - 3}
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
