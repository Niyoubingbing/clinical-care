"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
export function TodoListView({
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
