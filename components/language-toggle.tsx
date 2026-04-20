"use client";

import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useLocaleStore, type Locale } from "@/store/i18n-store";

/**
 * Two-state language toggle (中 / En). Persisted via the locale store.
 * Renders a pill with a subtle Languages icon; the letter `中` or `EN`
 * shows which state is NOT active (i.e. what you'd get by clicking).
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale } = useT();
  const setLocale = useLocaleStore((s) => s.setLocale);
  const hasHydrated = useLocaleStore((s) => s.hasHydrated);

  const next: Locale = locale === "zh" ? "en" : "zh";
  const label = locale === "zh" ? "EN" : "中";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(next)}
      aria-label="Switch language"
      className={cn(
        "h-8 gap-1 rounded-full px-2.5 text-xs text-muted-foreground hover:text-foreground",
        className,
      )}
      suppressHydrationWarning
    >
      <Languages className="size-3.5" strokeWidth={1.75} />
      <span className="font-medium">{hasHydrated ? label : "EN"}</span>
    </Button>
  );
}
