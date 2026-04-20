"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  RotateCcw,
  Pencil,
  Check,
  Save,
  Search,
  Flag,
  Send,
  Info,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PokemonIcon } from "@/components/pokemon-icon";
import {
  ALL_POKEMON,
  CONSTANTS,
  tasteToArray,
  type PokemonOverride,
} from "@/lib/data";
import { buildFeedbackIssueUrl } from "@/lib/feedback";
import { useAllPokemon, useOverridesStore } from "@/store/overrides-store";
import { cn } from "@/lib/utils";
import {
  ENVIRONMENT_CLASSES,
  ENVIRONMENT_EMOJI,
  SPECIALTIES,
  TASTES,
  TASTE_EMOJI,
  type Environment,
  type Pokemon,
  type Taste,
} from "@/types/pokemon";

export default function EditPage() {
  const merged = useAllPokemon();
  const overrides = useOverridesStore((s) => s.overrides);
  const hydrated = useOverridesStore((s) => s.hasHydrated);
  const setOne = useOverridesStore((s) => s.setOne);
  const removeOne = useOverridesStore((s) => s.removeOne);
  const clearAll = useOverridesStore((s) => s.clearAll);
  const exportAsJson = useOverridesStore((s) => s.exportAsJson);

  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Pokemon | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return merged;
    const q = query.trim();
    if (/^\d+$/.test(q)) {
      return merged.filter((p) => p.id === Number(q));
    }
    const qLow = q.toLowerCase();
    return merged.filter(
      (p) =>
        p.name.includes(q) ||
        (p.name_tw?.includes(q) ?? false) ||
        p.specialties.some((s) => s.includes(q)) ||
        p.specialties_en.some((s) => s.toLowerCase().includes(qLow)) ||
        p.likes.some((l) => l.includes(q)),
    );
  }, [merged, query]);

  const updateOverride = (id: number, patch: PokemonOverride) => setOne(id, patch);
  const resetOne = (id: number) => removeOne(id);
  const resetAll = () => {
    if (!confirm("确定清空所有本地修改？原始 pokemon.json 不受影响。")) return;
    clearAll();
  };

  const exportJson = () => {
    const json = exportAsJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pokemon.edited.${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitToGithub = () => {
    const { url, bodyTooLong, body } = buildFeedbackIssueUrl(
      merged,
      overrides,
    );
    if (bodyTooLong && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(body).catch(() => {});
      alert(
        "改动太多、URL 装不下——已把修改报告复制到剪贴板。\n\n下面会打开一个 GitHub issue 页面，直接粘贴到正文即可。",
      );
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const modifiedCount = Object.keys(overrides).length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Feedback
          </span>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            发现错误？
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            玩得多了、发现某只宝可梦的数据和实际不符？在这里把你觉得对的值填进去，
            修改只存你自己的浏览器（不会影响其他访客），但可以一键把差异发成 GitHub issue 提交给作者修正。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs",
              modifiedCount > 0
                ? "border-primary/40 bg-primary/5 text-primary"
                : "border-border/60 bg-background text-muted-foreground",
            )}
          >
            待反馈 {modifiedCount} 条
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={resetAll}
            disabled={modifiedCount === 0}
            className="gap-1.5 rounded-full"
          >
            <RotateCcw className="size-4" strokeWidth={1.75} />
            全部重置
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportJson}
            disabled={modifiedCount === 0}
            className="gap-1.5 rounded-full"
          >
            <Download className="size-4" strokeWidth={1.75} />
            导出 JSON
          </Button>
          <Button
            size="sm"
            onClick={submitToGithub}
            disabled={modifiedCount === 0}
            className="gap-1.5 rounded-full"
          >
            <Send className="size-4" strokeWidth={1.75} />
            提交给作者
          </Button>
        </div>
      </header>

      <Card className="rounded-3xl border-pkp-lavender-ink/20 bg-pkp-lavender/40 shadow-none">
        <CardContent className="flex items-start gap-2 p-4 text-sm text-pkp-lavender-ink">
          <Info className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          <div className="flex-1 leading-6">
            你在这页的修改 <strong>只存在你自己的浏览器</strong>，刷新后还在，但不会同步给其他人。
            确认某条数据确实有问题、希望修正到主仓库的话，点右上<strong>"提交给作者"</strong>——
            会把你改过的内容组织成一份简洁的 GitHub issue 让你在浏览器里确认并发送。
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-3xl border-border/60 bg-card shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.75}
            />
            <Input
              placeholder="搜索名字 / 编号 / 特长 / 喜欢事物"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-full pl-9"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            <span className="font-mono text-foreground">{filtered.length}</span>
            {" / "}
            <span className="font-mono">{merged.length}</span> 条 · 点击行右侧"编辑"打开编辑器
          </span>
        </CardContent>
      </Card>

      {hydrated ? (
        <Card className="overflow-hidden rounded-3xl border-border/60 bg-card shadow-sm">
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {filtered.map((p) => (
                <Row
                  key={p.id}
                  pokemon={p}
                  modified={!!overrides[p.id]}
                  onEdit={() => setEditing(p)}
                  onReset={() => resetOne(p.id)}
                />
              ))}
            </ul>
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                没有匹配的宝可梦
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <EditorDialog
        pokemon={editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSave={(patch) => {
          if (editing) {
            updateOverride(editing.id, patch);
            setEditing(null);
          }
        }}
      />
    </div>
  );
}

// --------------------------------------------------------------------------
// Row
// --------------------------------------------------------------------------

function Row({
  pokemon,
  modified,
  onEdit,
  onReset,
}: {
  pokemon: Pokemon;
  modified: boolean;
  onEdit: () => void;
  onReset: () => void;
}) {
  const envCls = pokemon.env
    ? ENVIRONMENT_CLASSES[pokemon.env as Environment]
    : null;
  const tastes = tasteToArray(pokemon.taste);
  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
      <PokemonIcon pokemon={pokemon} size={40} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">
            #{String(pokemon.id).padStart(3, "0")}
          </span>
          <span className="text-sm font-medium">{pokemon.name}</span>
          {!pokemon.is_playable ? (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              不可入住
            </span>
          ) : null}
          {modified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              已修改
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 pt-0.5">
          {envCls && pokemon.env ? (
            <span
              className={cn(
                envCls.bg,
                envCls.text,
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px]",
              )}
            >
              <span aria-hidden>
                {ENVIRONMENT_EMOJI[pokemon.env as Environment]}
              </span>
              {pokemon.env}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">无环境</span>
          )}
          {tastes.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-0.5 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              <span aria-hidden>{TASTE_EMOJI[t]}</span>
              {t}
            </span>
          ))}
          <span className="text-[11px] text-muted-foreground">
            · {pokemon.specialties.join(" / ")}
          </span>
          <span className="text-[11px] text-muted-foreground">
            · likes {pokemon.likes.length}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {modified ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 rounded-full px-2 text-xs text-muted-foreground"
          >
            还原
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="h-8 gap-1 rounded-full px-3 text-xs"
        >
          <Pencil className="size-3.5" strokeWidth={1.75} />
          编辑
        </Button>
      </div>
    </li>
  );
}

// --------------------------------------------------------------------------
// Editor dialog
// --------------------------------------------------------------------------

function EditorDialog({
  pokemon,
  onOpenChange,
  onSave,
}: {
  pokemon: Pokemon | null;
  onOpenChange: (open: boolean) => void;
  onSave: (patch: PokemonOverride) => void;
}) {
  const [name, setName] = useState("");
  const [env, setEnv] = useState<Environment | "none">("none");
  const [tastes, setTastes] = useState<Taste[]>([]);
  const [playable, setPlayable] = useState(true);
  const [specialties, setSpecialties] = useState<Set<string>>(new Set());
  const [littered, setLittered] = useState<Set<string>>(new Set());
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");

  const uniqueLittered = useMemo(() => {
    const s = new Set<string>();
    for (const p of ALL_POKEMON) for (const it of p.littered_items) s.add(it);
    return [...s].sort();
  }, []);
  const uniqueLikes = useMemo(() => {
    const s = new Set<string>();
    for (const p of ALL_POKEMON) for (const l of p.likes) s.add(l);
    return [...s].sort();
  }, []);

  useEffect(() => {
    if (!pokemon) return;
    setName(pokemon.name);
    setEnv((pokemon.env as Environment) ?? "none");
    setTastes(tasteToArray(pokemon.taste));
    setPlayable(pokemon.is_playable);
    setSpecialties(new Set(pokemon.specialties));
    setLittered(new Set(pokemon.littered_items));
    setLikes(new Set(pokemon.likes));
    setNotes(pokemon.notes.join("\n"));
  }, [pokemon]);

  if (!pokemon) return null;

  const toggleSet = <T,>(setState: (s: Set<T>) => void, s: Set<T>, v: T) => {
    const next = new Set(s);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setState(next);
  };

  const handleSave = () => {
    const patch: PokemonOverride = {
      name,
      env: env === "none" ? null : env,
      taste:
        tastes.length === 0
          ? null
          : tastes.length === 1
            ? tastes[0]
            : tastes,
      is_playable: playable,
      specialties: [...specialties],
      // update English specialties from mapping
      specialties_en: [...specialties].map(
        (s) => CONSTANTS.specialty_cn_to_en[s] ?? s,
      ),
      littered_items: [...littered],
      likes: [...likes],
      notes: notes.trim() ? notes.split("\n").filter(Boolean) : [],
    };
    onSave(patch);
  };

  return (
    <Dialog open={!!pokemon} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-3xl border-border/60 bg-card p-0 sm:max-w-2xl"
        style={{ maxHeight: "min(90vh, 820px)" }}
      >
        <ScrollArea className="max-h-[min(90vh,820px)]">
          <div className="flex flex-col gap-6 p-6 sm:p-8">
            <DialogHeader>
              <div className="flex items-center gap-4">
                <PokemonIcon pokemon={pokemon} size={56} />
                <div className="flex flex-col">
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    #{String(pokemon.id).padStart(3, "0")}
                  </span>
                  <DialogTitle>编辑 {pokemon.name}</DialogTitle>
                  <DialogDescription className="text-xs">
                    改动只保存在浏览器本地，可随时重置
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Name + playable */}
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">名字</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-full"
                />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background px-4">
                <Checkbox
                  id="playable"
                  checked={playable}
                  onCheckedChange={(v) => setPlayable(v === true)}
                />
                <Label
                  htmlFor="playable"
                  className="cursor-pointer text-sm text-foreground/80"
                >
                  可入住
                </Label>
              </div>
            </div>

            {/* Environment */}
            <Field label="喜欢环境">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setEnv("none")}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    env === "none"
                      ? "border-foreground bg-foreground text-background"
                      : "border-border/60 bg-background text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  无
                </button>
                {CONSTANTS.environments.map((e) => {
                  const cls = ENVIRONMENT_CLASSES[e];
                  const active = env === e;
                  return (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEnv(e)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                        active
                          ? `${cls.bg} ${cls.text} ${cls.border}`
                          : "border-border/60 bg-background text-foreground/70 hover:bg-muted/60",
                      )}
                    >
                      <span aria-hidden>{ENVIRONMENT_EMOJI[e]}</span>
                      {e}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Taste */}
            <Field label="口味（可多选，保存时若只选 1 个会存为字符串）">
              <div className="flex flex-wrap gap-1.5">
                {TASTES.map((t) => {
                  const active = tastes.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setTastes(
                          active
                            ? tastes.filter((x) => x !== t)
                            : [...tastes, t],
                        )
                      }
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/60 bg-background text-foreground/70 hover:bg-muted/60",
                      )}
                    >
                      <span aria-hidden>{TASTE_EMOJI[t]}</span>
                      {t}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Specialties */}
            <Field label="特长（多选）">
              <div className="flex flex-wrap gap-1">
                {SPECIALTIES.map((s) => {
                  const active = specialties.has(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        toggleSet(setSpecialties, specialties, s)
                      }
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/60 bg-background text-foreground/70 hover:bg-muted/60",
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Littered items */}
            <Field label="乱撒物（仅'乱撒'特长生效）">
              <div className="flex flex-wrap gap-1">
                {uniqueLittered.map((it) => {
                  const active = littered.has(it);
                  return (
                    <button
                      key={it}
                      type="button"
                      onClick={() => toggleSet(setLittered, littered, it)}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                        active
                          ? "border-pkp-peach-ink/20 bg-pkp-peach text-pkp-peach-ink"
                          : "border-border/60 bg-background text-foreground/70 hover:bg-muted/60",
                      )}
                    >
                      {it}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Likes */}
            <Field label="喜欢事物（多选）">
              <div className="flex flex-wrap gap-1">
                {uniqueLikes.map((l) => {
                  const active = likes.has(l);
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => toggleSet(setLikes, likes, l)}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                        active
                          ? "border-pkp-mint-ink/20 bg-pkp-mint text-pkp-mint-ink"
                          : "border-border/60 bg-background text-foreground/70 hover:bg-muted/60",
                      )}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Notes */}
            <Field label="备注（一行一条）">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="任何你对这条数据的纠偏 / 备注…"
                className="rounded-2xl"
              />
            </Field>

            <DialogFooter className="flex-row gap-2 sm:gap-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="rounded-full"
              >
                取消
              </Button>
              <Button onClick={handleSave} className="gap-1.5 rounded-full">
                <Save className="size-4" strokeWidth={1.75} />
                保存修改
              </Button>
            </DialogFooter>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

void Check; // keep import stable during refactors
