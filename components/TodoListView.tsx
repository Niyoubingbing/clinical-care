"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown } from "lucide-react";
import { Todo, Patient } from "@/types";
import { dueLabel } from "@/lib/time-parser";
import SwipeableTodo from "@/components/SwipeableTodo";

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
// 待办页与病人详情页共用，确保两处待办样式 / 交互完全一致。
// 长列表（>30）启用窗口虚拟化并关闭 per-item layout 动画，避免全部项重测量/重渲染。
function TodoListViewImpl({
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

  // 长列表阈值：超过则虚拟化窗口化渲染并关闭 layout 动画（P2-3）。
  const longList = list.length > 30;

  // 组合渲染序列：进行中在前，已完成（展开时）在后。
  const items = useMemo(() => {
    const base = pending.map((t) => ({ t, done: false }));
    if (showCompleted) {
      return [...base, ...completed.map((t) => ({ t, done: true }))];
    }
    return base;
  }, [pending, completed, showCompleted]);

  // 测量列表在文档中的纵向偏移，用于窗口虚拟化正确定位。
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setOffset(rect.top + window.scrollY);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [items.length, showCompleted]);

  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => 56,
    overscan: 8,
    scrollMargin: offset,
  });

  if (pending.length === 0 && completed.length === 0) {
    return <p className="px-1 py-2 text-[12px] text-muted">暂无待办</p>;
  }

  return (
    <div className="space-y-2">
      {!longList && (
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
      )}

      {longList && (
        <div
          ref={containerRef}
          style={{ height: virtualizer.getTotalSize(), position: "relative" }}
        >
          {virtualizer.getVirtualItems().map((vi) => {
            const item = items[vi.index];
            return (
              <div
                key={item.t.id}
                data-index={vi.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vi.start - offset}px)`,
                }}
                className="pb-2"
              >
                <SwipeableTodo
                  todo={item.t}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onOpen={patient ? onOpen : undefined}
                  swipeComplete
                />
              </div>
            );
          })}
        </div>
      )}

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
          {showCompleted && !longList && (
            <AnimatePresence initial={false}>
              {completed.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <SwipeableTodo
                    key={t.id}
                    todo={t}
                    onToggle={onToggle}
                    onDelete={onDelete}
                    onOpen={patient ? onOpen : undefined}
                    swipeComplete
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
}

export const TodoListView = memo(TodoListViewImpl);
export default TodoListView;
