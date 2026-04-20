import { cn } from "@/lib/utils";

/**
 * A quiet poké-ball mark — used as a small brand accent, never as hero art.
 * Render it muted (foreground at ~40% opacity) so it reads as a detail, not a logo blast.
 */
export function PokeballMark({
  className,
  size = 20,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M2 12h8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M14 12h8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.6"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" />
    </svg>
  );
}
