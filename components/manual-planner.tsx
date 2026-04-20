"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Users,
  Wand2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PokemonIcon } from "@/components/pokemon-icon";
import { usePlannerStore, useSelectedPokemon } from "@/store/planner-store";
import {
  allAssignedIds,
  mapHeadcount,
  useManualPlanStore,
  type ManualCell,
} from "@/store/manual-plan-store";
import { analyzeCycles } from "@/lib/cycles";
import {
  MAP_LABELS,
  MAX_MAPS,
  MAX_PER_MAP,
  PER_CELL,
  planEarlyMode,
} from "@/lib/planner";
import { commonOverlap } from "@/lib/similarity";
import { cn } from "@/lib/utils";
import {
  ENVIRONMENT_CLASSES,
  ENVIRONMENT_EMOJI,
  type Environment,
  type Pokemon,
} from "@/types/pokemon";

const ALL_ENVS: Environment[] = [
  "明亮",
  "温暖",
  "潮湿",
  "干燥",
  "昏暗",
  "凉爽",
];

interface Props {
  onPick: (p: Pokemon) => void;
}

export function ManualPlanner({ onPick }: Props) {
  const selected = useSelectedPokemon();
  const maps = useManualPlanStore((s) => s.maps);
  const addCell = useManualPlanStore((s) => s.addCell);
  const removeCell = useManualPlanStore((s) => s.removeCell);
  const setCellEnv = useManualPlanStore((s) => s.setCellEnv);
  const assign = useManualPlanStore((s) => s.assign);
  const unassign = useManualPlanStore((s) => s.unassign);
  const clearAll = useManualPlanStore((s) => s.clearAll);

  const [activeMap, setActiveMap] = useState<string>("0");
  const [pickedPokemonId, setPickedPokemonId] = useState<number | null>(null);

  const assigned = useMemo(() => allAssignedIds(maps), [maps]);
  const byId = useMemo(() => {
    const m = new Map<number, Pokemon>();
    for (const p of selected) m.set(p.id, p);
    return m;
  }, [selected]);

  const pool = useMemo(
    () => selected.filter((p) => !assigned.has(p.id)),
    [selected, assigned],
  );

  const autoPopulate = () => {
    // Seed from auto-plan: one cell per env group per map.
    const plan = planEarlyMode(selected);
    clearAll();
    plan.maps.forEach((m, mi) => {
      for (const t of m.terraces) {
        for (const c of t.cells) {
          addCell(mi, c.env);
          // The newly-added cell is the last in the array; grab its id next tick.
        }
      }
    });
    // Assign after cells exist
    setTimeout(() => {
      const freshMaps = useManualPlanStore.getState().maps;
      plan.maps.forEach((m, mi) => {
        const cells = freshMaps[mi] ?? [];
        let cellCursor = 0;
        for (const t of m.terraces)
          for (const c of t.cells) {
            const targetCell = cells[cellCursor];
            if (targetCell) {
              for (const p of c.pokemon) {
                useManualPlanStore.getState().assign(mi, targetCell.id, p.id);
              }
            }
            cellCursor += 1;
          }
      });
    }, 0);
  };

  const handleAssignToCell = (mapIdx: number, cellId: string) => {
    if (pickedPokemonId == null) return;
    const cell = maps[mapIdx]?.find((c) => c.id === cellId);
    if (cell && cell.pokemonIds.length >= PER_CELL) return;
    assign(mapIdx, cellId, pickedPokemonId);
    setPickedPokemonId(null);
  };

  if (selected.length === 0) {
    return (
      <Card className="rounded-3xl border-dashed border-border/60 bg-card/60 shadow-none">
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          先在"调整选择"里挑几只宝可梦，再来手动调整。
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="rounded-3xl border-border/60 bg-card shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Pool · 未分配
              </span>
              <span className="text-sm font-medium">
                {pool.length} 只待分配 · 点一只 → 再点目标格子放入
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={autoPopulate}
                className="gap-1.5 rounded-full"
              >
                <Wand2 className="size-4" strokeWidth={1.75} />
                从自动方案填入
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (confirm("清空所有手动分配？")) clearAll();
                }}
                className="rounded-full text-muted-foreground"
              >
                清空
              </Button>
            </div>
          </div>

          <Separator className="bg-border/60" />

          {pool.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              全部宝可梦都已分配好了 ✅
            </span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {pool.map((p) => (
                <PoolChip
                  key={p.id}
                  pokemon={p}
                  picked={pickedPokemonId === p.id}
                  onPick={() =>
                    setPickedPokemonId(
                      pickedPokemonId === p.id ? null : p.id,
                    )
                  }
                  onDetail={() => onPick(p)}
                />
              ))}
            </div>
          )}

          {pickedPokemonId != null ? (
            <div className="rounded-2xl border border-primary/40 bg-primary/5 px-3 py-2 text-xs text-primary">
              🫱 已选中 {byId.get(pickedPokemonId)?.name} — 点下方任一格子把它放进去。
              再点一次取消。
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Tabs value={activeMap} onValueChange={setActiveMap}>
        <TabsList className="w-full">
          {Array.from({ length: MAX_MAPS }).map((_, i) => {
            const count = mapHeadcount(maps[i] ?? []);
            const over = count > MAX_PER_MAP;
            return (
              <TabsTrigger
                key={i}
                value={String(i)}
                className={cn(
                  "flex-1 gap-1.5",
                  over && "text-destructive",
                )}
              >
                地图 {MAP_LABELS[i]}
                <span
                  className={cn(
                    "font-mono text-[10px]",
                    over ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {count}/{MAX_PER_MAP}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        {Array.from({ length: MAX_MAPS }).map((_, i) => (
          <TabsContent key={i} value={String(i)} className="mt-4">
            <MapBoard
              mapIdx={i}
              cells={maps[i] ?? []}
              byId={byId}
              pickedPokemonId={pickedPokemonId}
              onAddCell={(env) => addCell(i, env)}
              onRemoveCell={(cellId) => removeCell(i, cellId)}
              onChangeEnv={(cellId, env) => setCellEnv(i, cellId, env)}
              onClickCell={(cellId) => handleAssignToCell(i, cellId)}
              onRemovePokemon={(pokemonId) => unassign(pokemonId)}
              onPickDetail={onPick}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// --------------------------------------------------------------------------

function PoolChip({
  pokemon,
  picked,
  onPick,
  onDetail,
}: {
  pokemon: Pokemon;
  picked: boolean;
  onPick: () => void;
  onDetail: () => void;
}) {
  const cls = pokemon.env
    ? ENVIRONMENT_CLASSES[pokemon.env as Environment]
    : null;
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={onPick}
        onDoubleClick={onDetail}
        className={cn(
          "pkp-lift inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors",
          picked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border/60 bg-background hover:bg-muted/60",
        )}
        title={`${pokemon.name} #${pokemon.id}`}
      >
        <PokemonIcon pokemon={pokemon} size={22} />
        <span className="font-medium">{pokemon.name}</span>
        {cls && pokemon.env ? (
          <span
            className={cn(
              picked ? "bg-primary-foreground/20" : cls.bg,
              picked ? "text-primary-foreground" : cls.text,
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px]",
            )}
          >
            <span aria-hidden>
              {ENVIRONMENT_EMOJI[pokemon.env as Environment]}
            </span>
          </span>
        ) : null}
      </button>
    </div>
  );
}

// --------------------------------------------------------------------------
// MapBoard
// --------------------------------------------------------------------------

function MapBoard({
  mapIdx,
  cells,
  byId,
  pickedPokemonId,
  onAddCell,
  onRemoveCell,
  onChangeEnv,
  onClickCell,
  onRemovePokemon,
  onPickDetail,
}: {
  mapIdx: number;
  cells: ManualCell[];
  byId: Map<number, Pokemon>;
  pickedPokemonId: number | null;
  onAddCell: (env: Environment) => void;
  onRemoveCell: (cellId: string) => void;
  onChangeEnv: (cellId: string, env: Environment) => void;
  onClickCell: (cellId: string) => void;
  onRemovePokemon: (pokemonId: number) => void;
  onPickDetail: (p: Pokemon) => void;
}) {
  const allPokemon = useMemo(() => {
    const list: Pokemon[] = [];
    for (const c of cells)
      for (const id of c.pokemonIds) {
        const p = byId.get(id);
        if (p) list.push(p);
      }
    return list;
  }, [cells, byId]);

  const total = allPokemon.length;
  const cycleReport = useMemo(() => analyzeCycles(allPokemon), [allPokemon]);
  const overlap = useMemo(() => commonOverlap(allPokemon), [allPokemon]);

  return (
    <Card className="rounded-3xl border-border/60 bg-card shadow-sm">
      <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-muted text-sm font-semibold">
              {MAP_LABELS[mapIdx]}
            </span>
            <div className="flex flex-col">
              <span className="font-semibold">地图 {MAP_LABELS[mapIdx]}</span>
              <span className="text-[11px] text-muted-foreground">
                手动编辑 · 点格子放入已选中的宝可梦
              </span>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px]",
              total > MAX_PER_MAP
                ? "border-destructive/40 bg-destructive/5 text-destructive"
                : "border-border/60 bg-background text-foreground/70",
            )}
          >
            <Users className="mr-1 size-3" strokeWidth={1.75} />
            {total} / {MAX_PER_MAP}
          </Badge>
        </div>

        {/* Cycle completeness */}
        {total > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ["wood", cycleReport.wood_cycle, "木材"],
                ["brick", cycleReport.brick_cycle, "红砖"],
                ["iron", cycleReport.iron_bar_cycle, "铁条"],
              ] as const
            ).map(([k, rep, label]) => (
              <span
                key={k}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                  rep.complete
                    ? "border-pkp-mint-ink/20 bg-pkp-mint text-pkp-mint-ink"
                    : "border-border/60 bg-muted/40 text-muted-foreground",
                )}
                title={
                  rep.complete ? "循环完整" : `缺 ${rep.missingRoles.join("/")}`
                }
              >
                {rep.complete ? (
                  <CheckCircle2 className="size-3" strokeWidth={2} />
                ) : (
                  <AlertTriangle className="size-3" strokeWidth={2} />
                )}
                {label}
              </span>
            ))}
          </div>
        ) : null}

        {/* Cells grid */}
        {cells.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            <p>这张地图还没有格子。先选一个环境加一个 4×4 格子吧：</p>
            <EnvPickerButtons onPick={onAddCell} />
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {cells.map((c) => (
                <CellEditor
                  key={c.id}
                  cell={c}
                  byId={byId}
                  selectable={pickedPokemonId != null}
                  onChangeEnv={(env) => onChangeEnv(c.id, env)}
                  onRemove={() => onRemoveCell(c.id)}
                  onClick={() => onClickCell(c.id)}
                  onRemovePokemon={onRemovePokemon}
                  onPickDetail={onPickDetail}
                />
              ))}
            </div>
            <div className="flex flex-col items-start gap-2">
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                添加新格子（选环境）
              </span>
              <EnvPickerButtons onPick={onAddCell} />
            </div>
          </>
        )}

        {/* Overlap / suggestions */}
        {overlap.likes.length > 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2 pb-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                重叠区推荐物品
              </span>
              <span className="text-[11px] text-muted-foreground">
                覆盖 ≥ 2 只
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {overlap.likes
                .filter((l) => l.count >= 2)
                .slice(0, 12)
                .map((l) => (
                  <Badge
                    key={l.item}
                    variant="outline"
                    className="rounded-full border-pkp-mint-ink/20 bg-pkp-mint px-2 py-0.5 text-[11px] text-pkp-mint-ink"
                  >
                    {l.item}
                    <span className="ml-1 font-mono text-[10px] opacity-70">
                      ×{l.count}
                    </span>
                  </Badge>
                ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EnvPickerButtons({
  onPick,
}: {
  onPick: (env: Environment) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ALL_ENVS.map((e) => {
        const cls = ENVIRONMENT_CLASSES[e];
        return (
          <button
            key={e}
            type="button"
            onClick={() => onPick(e)}
            className={cn(
              cls.bg,
              cls.text,
              cls.border,
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
            )}
          >
            <Plus className="size-3" strokeWidth={2} />
            <span aria-hidden>{ENVIRONMENT_EMOJI[e]}</span>
            {e}
          </button>
        );
      })}
    </div>
  );
}

// --------------------------------------------------------------------------
// CellEditor
// --------------------------------------------------------------------------

function CellEditor({
  cell,
  byId,
  selectable,
  onChangeEnv,
  onRemove,
  onClick,
  onRemovePokemon,
  onPickDetail,
}: {
  cell: ManualCell;
  byId: Map<number, Pokemon>;
  selectable: boolean;
  onChangeEnv: (env: Environment) => void;
  onRemove: () => void;
  onClick: () => void;
  onRemovePokemon: (pokemonId: number) => void;
  onPickDetail: (p: Pokemon) => void;
}) {
  const cls = ENVIRONMENT_CLASSES[cell.env];
  const full = cell.pokemonIds.length >= PER_CELL;
  const pokemons = cell.pokemonIds
    .map((id) => byId.get(id))
    .filter((p): p is Pokemon => !!p);

  return (
    <div
      className={cn(
        cls.border,
        "flex flex-col gap-2 rounded-2xl border p-3 transition-all",
        selectable && !full
          ? "cursor-pointer ring-2 ring-primary/40 hover:ring-primary/70"
          : "",
        full && "opacity-80",
      )}
      onClick={selectable && !full ? onClick : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {/* Env picker */}
          {ALL_ENVS.map((e) => {
            const eCls = ENVIRONMENT_CLASSES[e];
            const active = cell.env === e;
            return (
              <button
                key={e}
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  onChangeEnv(e);
                }}
                className={cn(
                  "inline-flex items-center justify-center rounded-full border text-[10px] transition-colors",
                  active
                    ? `${eCls.bg} ${eCls.text} ${eCls.border} px-2 py-0.5`
                    : "size-5 border-border/60 bg-background hover:bg-muted/60",
                )}
                title={e}
              >
                <span aria-hidden>{ENVIRONMENT_EMOJI[e]}</span>
                {active ? <span className="ml-1">{e}</span> : null}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          <span className="font-mono text-[10px] text-muted-foreground">
            {cell.pokemonIds.length}/{PER_CELL}
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={(ev) => {
              ev.stopPropagation();
              onRemove();
            }}
            className="size-6 rounded-full text-muted-foreground"
            aria-label="删除格子"
          >
            <Trash2 className="size-3.5" strokeWidth={1.75} />
          </Button>
        </div>
      </div>

      {/* Pokemon in cell */}
      {pokemons.length === 0 ? (
        <div className="py-2 text-center text-[11px] text-muted-foreground">
          {selectable ? "点这里放入已选的宝可梦" : "（空格子）"}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {pokemons.map((p) => {
            const mismatch = p.env !== cell.env;
            return (
              <button
                key={p.id}
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  if (confirm(`把 ${p.name} 从格子里移出？`))
                    onRemovePokemon(p.id);
                }}
                onDoubleClick={(ev) => {
                  ev.stopPropagation();
                  onPickDetail(p);
                }}
                className={cn(
                  "pkp-lift relative inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs",
                  mismatch
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-border/60 bg-background",
                )}
                title={
                  mismatch
                    ? `${p.name} 喜欢 ${p.env}，这个格子是 ${cell.env}`
                    : p.name
                }
              >
                <PokemonIcon pokemon={p} size={20} />
                <span className="truncate">{p.name}</span>
                {mismatch ? (
                  <AlertTriangle
                    className="size-3 text-destructive"
                    strokeWidth={2}
                  />
                ) : null}
                <X className="size-3 text-muted-foreground" strokeWidth={2} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
