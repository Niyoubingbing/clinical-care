"use client";

import { useState } from "react";
import { Reorder, useDragControls, type DragControls } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { GripVertical, X, Plus, Check } from "lucide-react";
import { getSettings, updateSettings, uid } from "@/lib/db";
import { CustomGroup } from "@/types";
import { useApp } from "@/components/Providers";

const PALETTE = [
  "#fecaca", "#fde68a", "#bbf7d0", "#bfdbfe",
  "#ddd6fe", "#fbcfe8", "#a7f3d0", "#fca5a5",
];

export default function GroupsPage() {
  const { toast } = useApp();
  const settings = useLiveQuery(() => getSettings(), []);
  const list = settings?.customGroups ?? [];

  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[2]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const commit = (next: CustomGroup[], undo?: CustomGroup[]) => {
    updateSettings({ customGroups: next });
    if (undo) {
      toast({
        message: "已删除 · 撤销",
        actionLabel: "撤销",
        onAction: () => updateSettings({ customGroups: undo }),
      });
    }
  };

  const add = () => {
    const t = name.trim();
    if (!t) {
      toast({ message: "请输入分组名称" });
      return;
    }
    commit([...list, { id: uid(), name: t, color }]);
    setName("");
  };

  const remove = (id: string) => {
    const undo = list;
    commit(
      list.filter((g) => g.id !== id),
      undo
    );
  };

  const rename = (id: string, value: string) => {
    commit(list.map((g) => (g.id === id ? { ...g, name: value } : g)));
  };

  const recolor = (id: string, value: string) => {
    commit(list.map((g) => (g.id === id ? { ...g, color: value } : g)));
  };

  const onReorder = (ids: string[]) => {
    const byId = new Map(list.map((g) => [g.id, g]));
    const next = ids
      .map((id) => byId.get(id))
      .filter((g): g is CustomGroup => Boolean(g));
    commit(next);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-[20px] font-semibold text-main">分组管理</h1>
      <p className="text-[12px] text-muted">
        自定义查房分组。在病人详情页可一键切换到这里定义的分组。
      </p>

      <div className="card p-3">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[12px] text-muted">分组名称</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如 李组"
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <label className="text-[12px] text-muted">颜色</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-10 cursor-pointer rounded border border-border/60 bg-card"
            />
          </div>
          <button className="btn-primary h-[48px] px-3" onClick={add}>
            <Plus size={18} />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-full border-2 transition ${
                color === c ? "border-primary" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
              aria-label={`选择颜色 ${c}`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {list.length === 0 && (
          <p className="rounded-xl bg-card/50 px-4 py-8 text-center text-[13px] text-muted">
            暂无分组，先添加一个吧
          </p>
        )}
        {list.length > 0 && (
          <Reorder.Group
            axis="y"
            values={list.map((g) => g.id)}
            onReorder={onReorder}
            className="space-y-2"
          >
            {list.map((g) => (
              <GroupItem
                key={g.id}
                group={g}
                editing={editingId === g.id}
                onStartEdit={() => setEditingId(g.id)}
                onEndEdit={() => setEditingId(null)}
                onRename={(v) => rename(g.id, v)}
                onRecolor={(v) => recolor(g.id, v)}
                onRemove={() => remove(g.id)}
              />
            ))}
          </Reorder.Group>
        )}
      </div>
    </div>
  );
}

function GroupItem({
  group,
  editing,
  onStartEdit,
  onEndEdit,
  onRename,
  onRecolor,
  onRemove,
}: {
  group: CustomGroup;
  editing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onRename: (v: string) => void;
  onRecolor: (v: string) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={group.id}
      dragListener={false}
      dragControls={controls}
      className="card flex items-center gap-2 p-3 shadow-xs"
    >
      <span
        onPointerDown={(e) => controls.start(e)}
        aria-label="拖拽排序"
        className="shrink-0 cursor-grab touch-none select-none text-muted active:cursor-grabbing"
      >
        <GripVertical size={18} />
      </span>

      <label className="relative h-7 w-7 shrink-0 cursor-pointer rounded-full border border-border/60">
        <span
          className="block h-full w-full rounded-full"
          style={{ backgroundColor: group.color }}
        />
        <input
          type="color"
          value={group.color}
          onChange={(e) => onRecolor(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="修改分组颜色"
        />
      </label>

      {editing ? (
        <input
          autoFocus
          defaultValue={group.name}
          onBlur={(e) => {
            onRename(e.target.value.trim() || group.name);
            onEndEdit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onRename((e.target as HTMLInputElement).value.trim() || group.name);
              onEndEdit();
            }
            if (e.key === "Escape") onEndEdit();
          }}
          className="input h-9 flex-1"
        />
      ) : (
        <button
          onClick={onStartEdit}
          className="min-w-0 flex-1 truncate text-left text-[14px] font-medium text-main"
        >
          {group.name}
        </button>
      )}

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
