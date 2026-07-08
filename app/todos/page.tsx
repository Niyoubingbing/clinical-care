"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, todayStr } from "@/lib/db";
import { Todo, Patient } from "@/types";
import { dueLabel } from "@/lib/time-parser";
import { contrastTextColor, bedBlockLabel } from "@/lib/contrast";
import SwipeableTodo from "@/components/SwipeableTodo";
import EmptyState from "@/components/EmptyState";
import { useApp } from "@/components/Providers";

type Filter = "all" | "pending" | "today" | "overdue";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "pending", label: "未完成" },
  { key: "today", label: "今天到期" },
  { key: "overdue", label: "已逾期" },
];

function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    const da = a.dueDate ?? "9999-99-99";
    const db2 = b.dueDate ?? "9999-99-99";
    if (da !== db2) return da < db2 ? -1 : 1;
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
}

// 一组待办的展示：进行中按序平铺，已完成默认折叠（可展开）。
function TodoListView({
  list,
  passFilter,
  onToggle,
  onDelete,
  onOpen,
  patient,
}: {
  list: Todo[];
  passFilter: (t: Todo) => boolean;
  onToggle: (t: Todo) => void;
  onDelete: (t: Todo) => void;
  onOpen?: (t: Todo) => void;
  patient?: Patient | null;
}) {
  const [showCompleted, setShowCompleted] = useState(false);
  const pending = useMemo(
    () => sortTodos(list.filter((t) => t.status === "pending" && passFilter(t))),
    [list, passFilter]
  );
  const completed = useMemo(
    () => list.filter((t) => t.status === "completed" && passFilter(t)),
    [list, passFilter]
  );

  return (
    <div className="space-y-2">
      {pending.length === 0 && completed.length === 0 && (
        <p className="px-1 py-2 text-[12px] text-muted">暂无待办</p>
      )}
      <AnimatePresence initial={false}>
        {pending.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
          >
            <SwipeableTodo
              todo={t}
              onToggle={onToggle}
              onDelete={onDelete}
              onOpen={patient ? onOpen : undefined}
              swipeComplete
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {completed.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowCompleted((s) => !s)}
            className="flex w-full items-center gap-1 px-1 py-1.5 text-[12px] font-medium text-muted transition hover:text-main"
          >
            <ChevronDown
              size={14}
              className={`transition-transform ${showCompleted ? "" : "-rotate-90"}`}
            />
            已完成 {completed.length}
          </button>
          <AnimatePresence initial={false}>
            {showCompleted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {completed.map((t) => (
                  <SwipeableTodo
                    key={t.id}
                    todo={t}
                    onToggle={onToggle}
                    onDelete={onDelete}
                    onOpen={patient ? onOpen : undefined}
                    swipeComplete
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function TodosInner() {
  const router = useRouter();
  const { toast } = useApp();
  const sp = useSearchParams();
  const initialFilter = (sp.get("filter") as Filter) || "all";

  const [filter, setFilter] = useState<Filter>(initialFilter);

  const todos = useLiveQuery(() => db.todos.toArray(), []) ?? [];
  const patients = useLiveQuery(() => db.patients.toArray(), []) ?? [];
  const today = todayStr();

  const patientMap = useMemo(
    () => new Map(patients.map((p) => [p.id, p])),
    [patients]
  );

  // 通用待办（无 patientId）——永远置顶。
  const generalTodos = useMemo(
    () => todos.filter((t) => !t.patientId),
    [todos]
  );

  // 病人待办：按病人聚合为独立卡片。
  const patientGroups = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const t of todos) {
      if (t.patientId) {
        if (!map.has(t.patientId)) map.set(t.patientId, []);
        map.get(t.patientId)!.push(t);
      }
    }
    const groups: { patient: Patient | null; items: Todo[] }[] = patients
      .filter((p) => map.has(p.id))
      .map((p) => ({ patient: p, items: map.get(p.id)! }));
    // 病人已被删除但仍有待办：归到「未分配病人」兜底组。
    const orphanIds = [...map.keys()].filter((id) => !patientMap.has(id));
    for (const id of orphanIds) {
      groups.push({ patient: null, items: map.get(id)! });
    }
    // 按床号稳定排序（数字序）。
    groups.sort((a, b) => {
      const ba = a.patient?.bedNumber ?? "";
      const bb = b.patient?.bedNumber ?? "";
      return ba.localeCompare(bb, undefined, { numeric: true });
    });
    return groups;
  }, [todos, patients, patientMap]);

  const passFilter = (t: Todo): boolean => {
    if (filter === "all") return true;
    if (filter === "pending") return t.status === "pending";
    if (filter === "today")
      return t.status === "pending" && dueLabel(t.dueDate).level === "today";
    if (filter === "overdue")
      return t.status === "pending" && dueLabel(t.dueDate).level === "overdue";
    return true;
  };

  const onToggle = async (t: Todo) => {
    const done = t.status === "completed";
    if (!done && t.type === "换药" && t.patientId) {
      await db.patients.update(t.patientId, {
        lastDressingChange: today,
        updatedAt: Date.now(),
      });
    }
    await db.todos.update(t.id, {
      status: done ? "pending" : "completed",
      completedAt: done ? undefined : Date.now(),
    });
  };

  const onDelete = async (t: Todo) => {
    await db.todos.delete(t.id);
    toast({
      message: "已删除 · 撤销",
      actionLabel: "撤销",
      onAction: async () => {
        await db.todos.add(t);
        toast({ message: "已恢复" });
      },
    });
  };

  const onOpen = (t: Todo) => {
    if (t.patientId) router.push(`/patient/${t.patientId}`);
  };

  const hasAny =
    generalTodos.some(passFilter) ||
    patientGroups.some((g) => g.items.some(passFilter));

  return (
    <div className="space-y-4">
      <h1 className="text-[20px] font-semibold text-main">待办</h1>

      <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
              filter === f.key
                ? "bg-primary text-white"
                : "border border-border/60 bg-card text-muted"
            }`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!hasAny ? (
        <EmptyState title="没有符合条件的待办" hint="切换筛选或添加待办" />
      ) : (
        <>
          {/* 通用待办：永远置顶 + 大边框方块 */}
          <section className="rounded-2xl border-2 border-border/50 bg-card/40 p-4">
            <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-muted">
              通用待办
              <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-normal text-muted">
                {generalTodos.filter((t) => t.status === "pending").length} 进行中
              </span>
            </p>
            <TodoListView
              list={generalTodos}
              passFilter={passFilter}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          </section>

          {/* 病人待办：每位病人一张独立卡片，单病人待办集中展示 */}
          <div className="space-y-3">
            {patientGroups.map(({ patient, items }) => {
              const color = patient?.groupColor || "#e2e8f0";
              return (
                <section key={patient?.id ?? "orphan"} className="card p-3">
                  <div className="mb-2 flex items-center gap-2">
                    {patient && (
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold"
                        style={{
                          backgroundColor: color,
                          color: contrastTextColor(color),
                        }}
                      >
                        {bedBlockLabel(patient.bedNumber)}
                      </span>
                    )}
                    <span className="text-[14px] font-semibold text-main">
                      {patient?.name ?? "未分配病人"}
                    </span>
                    {patient?.bedNumber && (
                      <span className="text-[12px] text-muted">
                        {patient.bedNumber}
                      </span>
                    )}
                    {patient?.group && (
                      <span
                        className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                        style={{ backgroundColor: color + "33", color }}
                      >
                        {patient.group}
                      </span>
                    )}
                  </div>
                  <TodoListView
                    list={items}
                    passFilter={passFilter}
                    onToggle={onToggle}
                    onDelete={onDelete}
                    onOpen={onOpen}
                    patient={patient}
                  />
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function TodosPage() {
  return (
    <Suspense
      fallback={<div className="py-20 text-center text-muted">加载中…</div>}
    >
      <TodosInner />
    </Suspense>
  );
}
