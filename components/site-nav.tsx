"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Recycle,
  LayoutGrid,
  Sparkles,
  Pencil,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { PokeballMark } from "@/components/pokeball-mark";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  {
    href: "/pokedex",
    label: "图鉴",
    icon: BookOpen,
    match: (p: string) => p.startsWith("/pokedex"),
  },
  {
    href: "/recipes",
    label: "循环",
    icon: Recycle,
    match: (p: string) => p.startsWith("/recipes"),
  },
  {
    href: "/planner/early",
    label: "前期",
    icon: LayoutGrid,
    match: (p: string) => p === "/planner/early",
  },
  {
    href: "/planner/late",
    label: "后期",
    icon: Sparkles,
    match: (p: string) => p === "/planner/late",
  },
  {
    href: "/edit",
    label: "编辑",
    icon: Pencil,
    match: (p: string) => p.startsWith("/edit"),
  },
];

export function SiteNav() {
  const pathname = usePathname();
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
          {navItems.map(({ href, label, icon: Icon, match }) => {
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
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </div>

        <ThemeToggle className="shrink-0" />
      </nav>
    </header>
  );
}
