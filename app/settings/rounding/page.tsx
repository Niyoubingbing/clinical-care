"use client";

import { useEffect, useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, X, Plus, RotateCcw } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getSettings,
  updateSettings,
  defaultRoundingOrder,
  uid,
} from "@/lib/db";
import { RoundingUnit } from "@/types";
import { useApp } from "@/components/Providers";

export default function RoundingPage() {
  const { toast } = useApp();
  const settings = useLiveQuery(() => getSettings(), []);
  const [units, setUnits] = useState<RoundingUnit[]>([]);
  const inited = useRef(false);

  // 仅初始化一次：从 DB 读取，并为缺失 id 的旧数据补 id（一次性迁移）。
  // 关键：不再用 useEffect 持续反灌 state，避免破坏 Reorder 对 value 引用一致性的要求。
  useEffect(() => {
    if (!settings || inited.current) return;
    inited.current = true;
    const raw = settings.roundingOrder ?? [];
    const missing = raw.some((u) => !("id" in u) || !(u as RoundingUnit).id);
    const fixed = raw.map((u) =>
      "id" in u && (u as RoundingUnit).id
        ? (u as RoundingUnit)
        : ({ ...(u as RoundingUnit), id: uid() } as RoundingUnit)
    );
    setUnits(fixed);
    if (missing) updateSettings({ roundingOrder: fixed });
  }, [settings]);

  const save = (next: RoundingUnit[]) => {
    setUnits(next);
    updateSettings({ roundingOrder: next });
  };

  const updateUnit = (next: RoundingUnit) => {
    save(units.map((u) => (u.id === next.id ? next : u)));
  };

  const removeUnit = (id: string) => {
    save(units.filter((u) => u.id !== id));
  };

  const addRoom = () => {
    save([...units, { id: uid(), kind: "room", ward: "", beds: [] }]);
  };
  const addExtra = () => {
    save([...units, { id: uid(), kind: "extra-real", bed: "", room: "" }]);
  };

  const reset = () => {
    const def = defaultRoundingOrder();
    setUnits(def);
    updateSettings({ roundingOrder: def });
    toast({ message: "已重置为内置示例" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold text-main">查房顺序</h1>
        <button
          onClick={reset}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] text-muted hover:bg-surface-alt"
        >
          <RotateCcw size={16} /> 重置示例
        </button>
      </div>

      <p className="text-[12px] text-muted">
        拖动卡片左侧手柄调整顺序。病房块内床号可编辑；真实加床可指定归属病房。虚拟床不进入序列。
      </p>

      <Reorder.Group
        axis="y"
        values={units.map((u) => u.id)}
        onReorder={(ids) => {
          const byId = new Map(units.map((u) => [u.id, u]));
          save(
            (ids as string[])
              .map((id) => byId.get(id))
              .filter((u): u is RoundingUnit => Boolean(u))
          );
        }}
        className="space-y-2"
      >
        {units.map((u) => (
          <RoundRow
            key={u.id}
            u={u}
            onUpdate={updateUnit}
            onRemove={() => removeUnit(u.id)}
          />
        ))}
      </Reorder.Group>

      <div className="flex gap-2 pt-2">
        <button className="btn-secondary h-11 flex-1" onClick={addRoom}>
          <Plus size={16} /> 添加病房块
        </button>
        <button className="btn-secondary h-11 flex-1" onClick={addExtra}>
          <Plus size={16} /> 添加真实加床
        </button>
      </div>
    </div>
  );
}

function RoundRow({
  u,
  onUpdate,
  onRemove,
}: {
  u: RoundingUnit;
  onUpdate: (next: RoundingUnit) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={u.id}
      dragListener={false}
      dragControls={controls}
      className="card flex items-start gap-2 p-3"
    >
      <span
        onPointerDown={(e) => controls.start(e)}
        aria-label="拖拽排序"
        className="mt-1 shrink-0 cursor-grab touch-none select-none text-muted active:cursor-grabbing"
      >
        <GripVertical size={18} />
      </span>
      <div className="min-w-0 flex-1">
        {u.kind === "room" ? (
          <>
            <p className="text-[12px] font-medium text-primary">病房块</p>
            <input
              className="input mt-1 py-2 text-[13px]"
              placeholder="床号以空格分隔，如 309W01 309W02 309W03"
              value={u.beds.join(" ")}
              onChange={(e) => {
                const beds = e.target.value.trim().split(/\s+/).filter(Boolean);
                onUpdate({
                  id: u.id,
                  kind: "room",
                  ward: beds[0]?.replace(/\d+$/, "") ?? "",
                  beds,
                });
              }}
            />
          </>
        ) : (
          <>
            <p className="text-[12px] font-medium text-primary">真实加床</p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <input
                className="input py-2 text-[13px]"
                placeholder="床号 如 309WJ04"
                value={u.bed}
                onChange={(e) =>
                  onUpdate({ ...u, bed: e.target.value })
                }
              />
              <input
                className="input py-2 text-[13px]"
                placeholder="归属病房 如 309W41-43"
                value={u.room}
                onChange={(e) =>
                  onUpdate({ ...u, room: e.target.value })
                }
              />
            </div>
          </>
        )}
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
