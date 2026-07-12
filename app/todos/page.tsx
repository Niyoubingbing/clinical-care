"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, todayStr, DEFAULT_GROUP_COLOR } from "@/lib/db";
import { Todo, Patient } from "@/types";
import { dueLabel } from "@/lib/time-parser";
import { contrastTextColor, bedBlockLabel } from "@/lib/contrast";
import { TodoListView } from "@/components/TodoListView";
import EmptyState from "@/components/EmptyState";
import { useApp } from "@/components/Providers";

type Filter = "pending" | "completed" | "today" | "overdue";
const EMPTY_TODOS: Todo[] = [];
const EMPTY_PATIENTS: Patient[] = [];
const FILTERS: { key: Filter; label: string }[] = [
  { key: "pending", label: "未完成" },
  { key: "completed", label: "已完成" },
  { key: "today", label: "今天到期" },
  { key: "overdue", label: "已逾期" },
];

function TodosInner() {
  const router = useRouter();
  const { toast } = useApp();
  const sp = useSearchParams();
  const validFilters: Filter[] = ["pending", "completed", "today", "overdue"];
  const raw = sp.get("filter") as Filter | null;
  // 默认只展示未完成；旧的 ?filter=all 链接（已无此筛选项）回退到未完成。
  const initialFilter = raw && validFilters.includes(raw) ? raw : "pending";

  const [filter, setFilter] = useState<Filter>(initialFilter);

  const todos = useLiveQuery(() => db.todos.toArray(), []) ?? EMPTY_TODOS;
  const patients = useLiveQuery(() => db.patients.toArray(), []) ?? EMPTY_PATIENTS;
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

  // 「通用待办」头部计数随当前筛选变化：未完成视图看进行中数，已完成视图看已完成数。
  const generalCount = useMemo(
    () =>
      filter === "completed"
        ? generalTodos.filter((t) => t.status === "completed").length
        : generalTodos.filter((t) => t.status === "pending").length,
    [filter, generalTodos]
  );
  const generalCountLabel = filter === "completed" ? "已完成" : "进行中";

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

  // 筛选条件：用 useCallback 稳定引用，确保传给 memo 化的 TodoListView 时命中 memo。
  const passFilter = useCallback(
    (t: Todo): boolean => {
      if (filter === "pending") return t.status === "pending";
      if (filter === "completed") return t.status === "completed";
      if (filter === "today")
        return t.status === "pending" && dueLabel(t.dueDate).level === "today";
      if (filter === "overdue")
        return t.status === "pending" && dueLabel(t.dueDate).level === "overdue";
      return true;
    },
    [filter]
  );

  // 仅渲染「至少有一条待办通过当前筛选」的病人组，避免已完成-only 病人在
  // 「未完成/今天/逾期」等筛选下残留空卡片。
  const visiblePatientGroups = useMemo(
    () => patientGroups.filter((g) => g.items.some(passFilter)),
    [patientGroups, passFilter]
  );

  const onToggle = useCallback(
    async (t: Todo) => {
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
    },
    [today]
  );

  const onDelete = useCallback(
    async (t: Todo) => {
      await db.todos.delete(t.id);
      toast({
        message: "已删除 · 撤销",
        actionLabel: "撤销",
        onAction: async () => {
          await db.todos.add(t);
          toast({ message: "已恢复" });
        },
      });
    },
    [toast]
  );

  // 打开某待办所属病人：写入客户端 store 后跳转静态 /patient 页（离线可用）。
  const onOpen = useCallback(
    (t: Todo) => {
      if (t.patientId) {
        sessionStorage.setItem("cc:pid", t.patientId);
        router.push("/patient");
      }
    },
    [router]
  );

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
                ? "liquid-pill-active text-white"
                : "liquid-pill text-muted"
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
          {generalTodos.some(passFilter) && (
            <section className="liquid-panel rounded-[24px] p-4">
              <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-muted">
                通用待办
                <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-normal text-muted">
                  {generalCount} {generalCountLabel}
                </span>
              </p>
              <TodoListView
                list={generalTodos}
                passFilter={passFilter}
                onToggle={onToggle}
                onDelete={onDelete}
                expandCompleted={filter === "completed"}
              />
            </section>
          )}

          {/* 病人待办：每位病人一张独立卡片，单病人待办集中展示 */}
          <div className="space-y-3">
            {visiblePatientGroups.map(({ patient, items }) => {
              const color = patient?.groupColor || DEFAULT_GROUP_COLOR;
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
                        style={{ backgroundColor: color + "22", color: contrastTextColor(color) }}
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
                    expandCompleted={filter === "completed"}
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
