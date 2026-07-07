"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { GripVertical, ArrowUp, ArrowDown, X, Plus } from "lucide-react";
import { getSettings, updateSettings } from "@/lib/db";
import { QuickTodo } from "@/types";
import { useApp } from "@/components/Providers";

const TYPES = [
  "换药",
  "查血",
  "开术前",
  "明天出院",
  "康复会诊",
  "会诊",
  "复查",
  "开查血",
  "其他",
];

export default function QuickTodosPage() {
  const { toast } = useApp();
  const settings = useLiveQuery(() => getSettings(), []);
  const list = settings?.quickTodos ?? [];

  const [label, setLabel] = useState("");
  const [type, setType] = useState("换药");

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
    commit([...list, { label: t, type, content: t }]);
    setLabel("");
  };

  const remove = (i: number) => {
    const undo = list;
    const next = list.filter((_, idx) => idx !== i);
    commit(next, undo);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
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
            />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-[12px] text-muted">类型</label>
            <select
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
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
        {list.map((qt, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-xl bg-card p-3 shadow-xs"
          >
            <GripVertical size={18} className="text-muted" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-main">{qt.label}</p>
              <p className="text-[12px] text-muted">{qt.type}</p>
            </div>
            <button
              aria-label="上移"
              onClick={() => move(i, -1)}
              className="rounded-lg p-1.5 text-muted hover:bg-surface-alt"
            >
              <ArrowUp size={18} />
            </button>
            <button
              aria-label="下移"
              onClick={() => move(i, 1)}
              className="rounded-lg p-1.5 text-muted hover:bg-surface-alt"
            >
              <ArrowDown size={18} />
            </button>
            <button
              aria-label="删除"
              onClick={() => remove(i)}
              className="rounded-lg p-1.5 text-danger hover:bg-danger/10"
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
