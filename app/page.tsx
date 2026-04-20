import Link from "next/link";
import {
  BookOpen,
  Recycle,
  LayoutGrid,
  Sparkles,
  Pencil,
  ArrowRight,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PokeballMark } from "@/components/pokeball-mark";
import {
  ENVIRONMENTS,
  ENVIRONMENT_EMOJI,
  ENVIRONMENT_CLASSES,
} from "@/types/pokemon";

const modules = [
  {
    href: "/pokedex",
    title: "图鉴",
    subtitle: "Pokédex",
    description: "300 只宝可梦的特长、环境、口味与喜好,支持多维筛选。",
    icon: BookOpen,
    accent: "bg-pkp-mint text-pkp-mint-ink",
    ready: true,
  },
  {
    href: "/recipes",
    title: "资源循环",
    subtitle: "Recipes",
    description: "木材 / 红砖 / 铁条三条循环 + 废纸一次性加工,一键推荐组合。",
    icon: Recycle,
    accent: "bg-pkp-peach text-pkp-peach-ink",
    ready: true,
  },
  {
    href: "/planner/early",
    title: "前期规划器",
    subtitle: "Early-game",
    description:
      "按资源循环导向,自动或手动把宝可梦分配到最多 5 张地图、每张 25 只。",
    icon: LayoutGrid,
    accent: "bg-pkp-sky text-pkp-sky-ink",
    ready: true,
  },
  {
    href: "/planner/late",
    title: "后期规划器",
    subtitle: "Late-game",
    description:
      "相似度矩阵 + 自动分组,打造精致空间;环境可混,重叠区物品共享。",
    icon: Sparkles,
    accent: "bg-pkp-pink text-pkp-pink-ink",
    ready: true,
  },
  {
    href: "/edit",
    title: "数据纠错",
    subtitle: "Edit",
    description: "表格化编辑字段,改动走 localStorage,可一键导出 JSON。",
    icon: Pencil,
    accent: "bg-pkp-lavender text-pkp-lavender-ink",
    ready: true,
  },
] as const;

export default function Home() {
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
            <span>为宝可梦选一个宜居的角落</span>
          </div>

          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              把 300 只宝可梦,<br className="hidden sm:block" />
              安放在对的地方。
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Pokopia
              的居住地规划,需要同时顾及资源循环、地图上限、以及每只小家伙喜欢的环境与物品。
              这里把这些规则整理成图鉴、配方、规划器与编辑器,让搭建过程变成一件安静的乐事。
            </p>
          </div>

          {/* Environment palette preview */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              environments
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
                  {env}
                </Badge>
              );
            })}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="mx-auto max-w-5xl px-6 pb-24 sm:px-10">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-lg font-semibold text-foreground/90">五个模块</h2>
          <span className="text-xs text-muted-foreground">
            图鉴 · 循环 · 前期 · 后期 · 编辑
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(
            ({
              href,
              title,
              subtitle,
              description,
              icon: Icon,
              accent,
              ready,
            }) => {
              const content = (
                <Card className="pkp-lift group relative h-full rounded-3xl border-border/60 bg-card shadow-sm">
                  <CardContent className="flex h-full flex-col gap-5 p-6">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex size-10 items-center justify-center rounded-2xl ${accent}`}
                      >
                        <Icon className="size-5" strokeWidth={1.75} />
                      </span>
                      <div className="flex flex-col">
                        <span className="font-semibold">{title}</span>
                        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                          {subtitle}
                        </span>
                      </div>
                    </div>
                    <p className="flex-1 text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      {ready ? (
                        <span className="inline-flex items-center gap-1 text-primary">
                          进入
                          <ArrowRight
                            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                            strokeWidth={1.75}
                          />
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          即将上线
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
              return ready ? (
                <Link key={href} href={href} className="block">
                  {content}
                </Link>
              ) : (
                <div key={href} aria-disabled className="opacity-80">
                  {content}
                </div>
              );
            },
          )}
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-xs text-muted-foreground sm:px-10">
          <span>
            数据 v0.2 · 300 只宝可梦 · 287 可入住 · 5 张地图 × 25 只上限
          </span>
          <span className="font-mono">pokopia-planner</span>
        </div>
      </footer>
    </div>
  );
}
