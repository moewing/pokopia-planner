"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import type { Pokemon } from "@/types/pokemon";

/**
 * Pokemon icon with automatic fallback.
 *
 * Primary image lives on pokopiamap.com CDN (Pokopia in-game art); if it
 * 403/times out, we swap to the PokeAPI GitHub CDN (stable but shows
 * official artwork instead of Pokopia sprites).
 */
export function PokemonIcon({
  pokemon,
  size = 80,
  className,
  priority,
}: {
  pokemon: Pick<Pokemon, "icon_url" | "icon_url_fallback" | "name" | "id">;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  const [src, setSrc] = useState(pokemon.icon_url);
  const [hasFallen, setHasFallen] = useState(false);
  return (
    <img
      src={src}
      alt={`#${String(pokemon.id).padStart(3, "0")} ${pokemon.name}`}
      width={size}
      height={size}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn(
        "object-contain",
        "[image-rendering:auto]",
        className,
      )}
      style={{ width: size, height: size }}
      onError={() => {
        if (!hasFallen) {
          setSrc(pokemon.icon_url_fallback);
          setHasFallen(true);
        }
      }}
    />
  );
}
