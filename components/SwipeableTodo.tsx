"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Trash2, Circle } from "lucide-react";
import { Todo } from "@/types";
import { dueLabel } from "@/lib/time-parser";

const ACTION_WIDTH = 112; // 7rem

function SwipeableTodo({
  todo,
  onToggle,
  onDelete,
  onOpen,
}: {
  todo: Todo;
  onToggle: (t: Todo) => void;
  onDelete: (t: Todo) => void;
  onOpen?: (t: Todo) => void;
}) {
  const [open, setOpen] = useState(false);
  const done = todo.status === "completed";
  const info = dueLabel(todo.dueDate);
  const showDue = !done && todo.dueDate;

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute inset-y-0 right-0 flex items-center gap-3 pr-4">
        <button
          aria-label="完成"
          onClick={() => onToggle(todo)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-success text-white shadow-sm active:scale-95"
        >
          <CheckCircle2 size={22} />
        </button>
        <button
          aria-label="删除"
          onClick={() => onDelete(todo)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-danger text-white shadow-sm active:scale-95"
        >
          <Trash2 size={22} />
        </button>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -ACTION_WIDTH, right: 0 }}
        dragElastic={0.05}
        animate={{ x: open ? -ACTION_WIDTH : 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -50) setOpen(true);
          else if (info.offset.x > 50) setOpen(false);
        }}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          if (onOpen) onOpen(todo);
        }}
        className="relative flex items-start gap-3 rounded-xl bg-card p-3 shadow-xs"
        style={{ opacity: done ? 0.6 : 1 }}
      >
        <button
          aria-label={done ? "标记为未完成" : "标记为完成"}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(todo);
          }}
          className="mt-0.5 shrink-0"
        >
          {done ? (
            <CheckCircle2 size={20} className="text-success" />
          ) : (
            <Circle size={20} className="text-muted" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`text-[14px] text-main ${
              done ? "line-through" : ""
            }`}
          >
            {todo.content}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {todo.type && todo.type !== "其他" && (
              <span className="badge-muted">{todo.type}</span>
            )}
            {showDue && (
              <span
                className={`badge ${
                  info.level === "overdue"
                    ? "badge-danger"
                    : info.level === "today"
                      ? "badge-warning"
                      : "badge-muted"
                }`}
              >
                {info.text}
              </span>
            )}
            {done && <span className="badge-success">已完成</span>}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default React.memo(SwipeableTodo);
