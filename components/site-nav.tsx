"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Recycle,
  LayoutGrid,
  Sparkles,
  Flag,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { PokeballMark } from "@/components/pokeball-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useT } from "@/lib/i18n";

const navItems = [
  {
    href: "/pokedex",
    labelKey: "nav.pokedex",
    icon: BookOpen,
    match: (p: string) => p.startsWith("/pokedex"),
  },
  {
    href: "/recipes",
    labelKey: "nav.recipes",
    icon: Recycle,
    match: (p: string) => p.startsWith("/recipes"),
  },
  {
    href: "/planner/early",
    labelKey: "nav.plannerEarly",
    icon: LayoutGrid,
    match: (p: string) => p === "/planner/early",
  },
  {
    href: "/planner/late",
    labelKey: "nav.plannerLate",
    icon: Sparkles,
    match: (p: string) => p === "/planner/late",
  },
  {
    href: "/feedback",
    labelKey: "nav.feedback",
    icon: Flag,
    match: (p: string) => p.startsWith("/feedback") || p.startsWith("/edit"),
  },
];

export function SiteNav() {
  const pathname = usePathname();
  const { t } = useT();

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 pr-3 text-sm font-semibold tracking-wide"
        >
          <PokeballMark size={18} className="text-primary" />
          <span className="hidden sm:inline">Pokopia Planner</span>
        </Link>

        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {navItems.map(({ href, labelKey, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} />
                <span className="hidden sm:inline">{t(labelKey)}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
