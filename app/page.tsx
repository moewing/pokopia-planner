"use client";

import Link from "next/link";
import {
  BookOpen,
  Recycle,
  LayoutGrid,
  Sparkles,
  Flag,
  ArrowRight,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PokeballMark } from "@/components/pokeball-mark";
import { useT } from "@/lib/i18n";
import {
  ENVIRONMENTS,
  ENVIRONMENT_EMOJI,
  ENVIRONMENT_CLASSES,
} from "@/types/pokemon";

const modules = [
  {
    href: "/pokedex",
    key: "pokedex" as const,
    icon: BookOpen,
    accent: "bg-pkp-mint text-pkp-mint-ink",
  },
  {
    href: "/recipes",
    key: "recipes" as const,
    icon: Recycle,
    accent: "bg-pkp-peach text-pkp-peach-ink",
  },
  {
    href: "/planner/early",
    key: "plannerEarly" as const,
    icon: LayoutGrid,
    accent: "bg-pkp-sky text-pkp-sky-ink",
  },
  {
    href: "/planner/late",
    key: "plannerLate" as const,
    icon: Sparkles,
    accent: "bg-pkp-pink text-pkp-pink-ink",
  },
  {
    href: "/feedback",
    key: "feedback" as const,
    icon: Flag,
    accent: "bg-pkp-lavender text-pkp-lavender-ink",
  },
];

export default function Home() {
  const { t, translateEnv } = useT();

  return (
    <div className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pkp-paper absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto flex max-w-5xl flex-col gap-10 px-6 pt-20 pb-16 sm:px-10 md:pt-28 md:pb-20">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PokeballMark size={18} className="text-primary/80" />
            <span className="tracking-wide">Pokopia Planner</span>
            <span className="text-muted-foreground/60">·</span>
            <span>{t("home.tagline")}</span>
          </div>

          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              {t("home.heroA")}
              <br className="hidden sm:block" />
              {t("home.heroB")}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              {t("home.description")}
            </p>
          </div>

          {/* Environment palette preview */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {t("home.environments")}
            </span>
            {ENVIRONMENTS.map((env) => {
              const cls = ENVIRONMENT_CLASSES[env];
              return (
                <Badge
                  key={env}
                  variant="outline"
                  className={`${cls.bg} ${cls.text} ${cls.border} gap-1.5 rounded-full border px-3 py-1 text-xs font-medium`}
                >
                  <span aria-hidden>{ENVIRONMENT_EMOJI[env]}</span>
                  {translateEnv(env)}
                </Badge>
              );
            })}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="mx-auto max-w-5xl px-6 pb-24 sm:px-10">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-lg font-semibold text-foreground/90">
            {t("home.modulesTitle")}
          </h2>
          <span className="text-xs text-muted-foreground">
            {t("home.modulesSubtitle")}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ href, key, icon: Icon, accent }) => (
            <Link key={href} href={href} className="block">
              <Card className="pkp-lift group relative h-full rounded-3xl border-border/60 bg-card shadow-sm">
                <CardContent className="flex h-full flex-col gap-5 p-6">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex size-10 items-center justify-center rounded-2xl ${accent}`}
                    >
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <div className="flex flex-col">
                      <span className="font-semibold">
                        {t(`home.modules.${key}.title`)}
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                        {t(`home.modules.${key}.subtitle`)}
                      </span>
                    </div>
                  </div>
                  <p className="flex-1 text-sm leading-6 text-muted-foreground">
                    {t(`home.modules.${key}.description`)}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1 text-primary">
                      {t("home.enter")}
                      <ArrowRight
                        className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                        strokeWidth={1.75}
                      />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-xs text-muted-foreground sm:px-10">
          <span>{t("home.footerData")}</span>
          <span className="font-mono">pokopia-planner</span>
        </div>
      </footer>
    </div>
  );
}
