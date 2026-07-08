"use client";

import { useState } from "react";
import { Reorder, useDragControls, type DragControls } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { GripVertical, X, Plus } from "lucide-react";
import { getSettings, updateSettings, uid } from "@/lib/db";
import { QuickTodo } from "@/types";
import { useApp } from "@/components/Providers";

export default function QuickTodosPage() {
  const { toast } = useApp();
  const settings = useLiveQuery(() => getSettings(), []);
  const list = settings?.quickTodos ?? [];

  const [label, setLabel] = useState("");

  const commit = (next: QuickTodo[], undo?: QuickTodo[]) => {
    updateSettings({ quickTodos: next });
    if (undo) {
      toast({
        message: "已删除 · 撤销",
        actionLabel: "撤销",
        onAction: () => updateSettings({ quickTodos: undo }),
      });
    }
  };

  const add = () => {
    const t = label.trim();
    if (!t) {
      toast({ message: "请输入标签" });
      return;
    }
    commit([...list, { id: uid(), label: t, type: "其他", content: t }]);
    setLabel("");
  };

  const remove = (i: number) => {
    const undo = list;
    const next = list.filter((_, idx) => idx !== i);
    commit(next, undo);
  };

  const onReorder = (ids: string[]) => {
    const byId = new Map(
      list.map((item, i) => [item.id ?? `qt-${i}`, item] as const)
    );
    const next = ids
      .map((id) => byId.get(id))
      .filter((q): q is QuickTodo => Boolean(q));
    commit(next);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-[20px] font-semibold text-main">快捷待办</h1>

      <div className="card p-3">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[12px] text-muted">标签</label>
            <input
              className="input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="如 换药"
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
          </div>
          <button className="btn-primary h-[48px] px-3" onClick={add}>
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {list.length === 0 && (
          <p className="rounded-xl bg-card/50 px-4 py-8 text-center text-[13px] text-muted">
            暂无快捷待办
          </p>
        )}
        {list.length > 0 && (
          <Reorder.Group
            axis="y"
            values={list.map((qt, i) => qt.id ?? `qt-${i}`)}
            onReorder={onReorder}
            className="space-y-2"
          >
            {list.map((qt, i) => (
              <QuickTodoItem
                key={qt.id ?? `qt-${i}`}
                id={qt.id ?? `qt-${i}`}
                item={qt}
                onRemove={() => remove(i)}
              />
            ))}
          </Reorder.Group>
        )}
      </div>
    </div>
  );
}

function DragHandle({ controls }: { controls: DragControls }) {
  return (
    <span
      onPointerDown={(e) => controls.start(e)}
      aria-label="拖拽排序"
      className="shrink-0 cursor-grab touch-none select-none text-muted active:cursor-grabbing"
    >
      <GripVertical size={18} />
    </span>
  );
}

function QuickTodoItem({
  id,
  item,
  onRemove,
}: {
  id: string;
  item: QuickTodo;
  onRemove: () => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      className="card flex items-center gap-2 p-3 shadow-xs"
    >
      <DragHandle controls={controls} />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-main">{item.label}</p>
        <p className="text-[12px] text-muted">{item.type}</p>
      </div>
      <button
        aria-label="删除"
        onClick={onRemove}
        className="rounded-lg p-1.5 text-danger hover:bg-danger/10"
      >
        <X size={18} />
      </button>
    </Reorder.Item>
  );
}
