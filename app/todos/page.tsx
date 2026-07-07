"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db, todayStr } from "@/lib/db";
import { Todo } from "@/types";
import { dueLabel } from "@/lib/time-parser";
import { listItemTransition } from "@/lib/motion";
import SwipeableTodo from "@/components/SwipeableTodo";
import EmptyState from "@/components/EmptyState";
import { useApp } from "@/components/Providers";

type Seg = "patient" | "general";
type Filter = "all" | "pending" | "completed" | "today" | "overdue";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "pending", label: "未完成" },
  { key: "completed", label: "已完成" },
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

function TodosInner() {
  const router = useRouter();
  const { toast } = useApp();
  const sp = useSearchParams();
  const initialFilter = (sp.get("filter") as Filter) || "all";

  const [seg, setSeg] = useState<Seg>("patient");
  const [filter, setFilter] = useState<Filter>(initialFilter);

  const todos = useLiveQuery(() => db.todos.toArray(), []) ?? [];
  const patients = useLiveQuery(() => db.patients.toArray(), []) ?? [];
  const today = todayStr();

  const patientMap = useMemo(
    () => new Map(patients.map((p) => [p.id, p])),
    [patients]
  );

  const base = useMemo(
    () =>
      todos.filter((t) =>
        seg === "patient" ? !!t.patientId : !t.patientId
      ),
    [todos, seg]
  );

  const filtered = useMemo(() => {
    return base.filter((t) => {
      if (filter === "all") return true;
      if (filter === "pending") return t.status === "pending";
      if (filter === "completed") return t.status === "completed";
      if (filter === "today")
        return t.status === "pending" && dueLabel(t.dueDate).level === "today";
      if (filter === "overdue")
        return t.status === "pending" && dueLabel(t.dueDate).level === "overdue";
      return true;
    });
  }, [base, filter]);

  const list = sortTodos(filtered);

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

  return (
    <div className="space-y-4">
      <h1 className="text-[20px] font-semibold text-main">待办</h1>

      <div className="flex gap-2">
        <button
          className={`flex-1 rounded-xl py-2.5 text-[14px] font-medium transition ${
            seg === "patient"
              ? "bg-primary text-white"
              : "bg-surface-alt text-muted"
          }`}
          onClick={() => setSeg("patient")}
        >
          病人待办
        </button>
        <button
          className={`flex-1 rounded-xl py-2.5 text-[14px] font-medium transition ${
            seg === "general"
              ? "bg-primary text-white"
              : "bg-surface-alt text-muted"
          }`}
          onClick={() => setSeg("general")}
        >
          通用待办
        </button>
      </div>

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

      {list.length === 0 ? (
        <EmptyState title="没有符合条件的待办" hint="切换筛选或添加待办" />
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {list.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={listItemTransition}
              >
                {seg === "patient" && t.patientId && patientMap.get(t.patientId) && (
                  <p className="mb-1 px-1 text-[11px] text-muted">
                    {patientMap.get(t.patientId)!.bedNumber}{" "}
                    {patientMap.get(t.patientId)!.name}
                  </p>
                )}
                <SwipeableTodo
                  todo={t}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onOpen={seg === "patient" ? onOpen : undefined}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
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
