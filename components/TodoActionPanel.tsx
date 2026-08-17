"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";
import { addTodo, db, getSettings } from "@/lib/db";
import { inferTodoType, parseTime } from "@/lib/time-parser";
import { Todo } from "@/types";
import { useApp } from "./Providers";

export default function TodoActionPanel({
  patientId,
  onAddTodo,
  pendingCount,
}: {
  patientId: string;
  onAddTodo: () => void;
  pendingCount: number;
}) {
  const { toast } = useApp();
  const quickTodos = useLiveQuery(async () => (await getSettings()).quickTodos, []);
  const todos = useLiveQuery(
    () => db.todos.where("patientId").equals(patientId).toArray(),
    [patientId]
  );

  const onQuickAdd = async (text: string) => {
    const exists = (todos ?? []).some(
      (todo: Todo) => todo.status === "pending" && todo.content.trim() === text.trim()
    );
    if (exists) {
      toast({ message: "该待办已存在" });
      return;
    }
    const parsed = parseTime(text);
    await addTodo({
      patientId,
      content: text,
      type: inferTodoType(text),
      dueDate: parsed?.date,
    });
    toast({ message: "待办已添加" });
  };

  return (
    <section className="todo-action-panel card p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-main">待办</h2>
          <p className="mt-0.5 text-[12px] text-muted">
            {pendingCount ? `${pendingCount} 项待完成` : "今天还没有待完成事项"}
          </p>
        </div>
        <button className="btn-primary h-10 px-3 text-[13px]" onClick={onAddTodo}>
          <Plus size={16} /> 添加待办
        </button>
      </div>

      {!!quickTodos?.length && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
          <span className="text-[12px] text-muted">快捷添加</span>
          {quickTodos.map((item) => {
            const text = item.content?.trim() || item.label;
            return (
              <button
                key={item.id}
                onClick={() => onQuickAdd(text)}
                className="todo-quick-chip"
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
