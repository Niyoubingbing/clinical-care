"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, getSettings, addTodo } from "@/lib/db";
import { useApp } from "./Providers";
import { Todo } from "@/types";

export default function QuickTodoBar({ patientId }: { patientId: string }) {
  const { toast } = useApp();
  const quickTodos = useLiveQuery(async () => {
    const s = await getSettings();
    return s.quickTodos;
  }, []);

  const pending = useLiveQuery(
    () => db.todos.where("patientId").equals(patientId).toArray(),
    [patientId]
  );

  if (!quickTodos || quickTodos.length === 0) return null;

  const onAdd = async (label: string, type: string, content?: string) => {
    const text = content && content.trim() ? content : label;
    const exists = (pending ?? []).some(
      (t: Todo) =>
        t.status === "pending" && t.content.trim() === text.trim()
    );
    if (exists) {
      toast({ message: "该待办已存在" });
      return;
    }
    await addTodo({ patientId, content: text, type });
    toast({ message: "待办已添加" });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {quickTodos.map((qt, i) => (
        <button
          key={i}
          onClick={() => onAdd(qt.label, qt.type, qt.content)}
          className="rounded-full border border-border/60 bg-card px-3 py-1.5 text-[12px] font-medium text-main transition active:scale-95 hover:border-primary"
        >
          {qt.label}
        </button>
      ))}
    </div>
  );
}
