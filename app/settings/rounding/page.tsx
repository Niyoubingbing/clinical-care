"use client";

import { useEffect, useState } from "react";
import { Reorder } from "framer-motion";
import { GripVertical, X, Plus, RotateCcw } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { getSettings, updateSettings, defaultRoundingOrder } from "@/lib/db";
import { RoundingUnit } from "@/types";
import { useApp } from "@/components/Providers";

export default function RoundingPage() {
  const { toast } = useApp();
  const settings = useLiveQuery(() => getSettings(), []);
  const [units, setUnits] = useState<RoundingUnit[]>([]);

  useEffect(() => {
    if (settings?.roundingOrder) setUnits(settings.roundingOrder);
  }, [settings?.roundingOrder]);

  const save = (next: RoundingUnit[]) => {
    setUnits(next);
    updateSettings({ roundingOrder: next });
  };

  const updateUnit = (i: number, patch: Partial<RoundingUnit>) => {
    const next = units.map((u, idx) =>
      idx === i ? ({ ...u, ...patch } as RoundingUnit) : u
    );
    save(next);
  };

  const removeUnit = (i: number) => {
    save(units.filter((_, idx) => idx !== i));
  };

  const addRoom = () => {
    save([...units, { kind: "room", ward: "", beds: [] }]);
  };
  const addExtra = () => {
    save([...units, { kind: "extra-real", bed: "", room: "" }]);
  };

  const reset = () => {
    updateSettings({ roundingOrder: defaultRoundingOrder() });
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
        拖动卡片调整顺序。病房块内床号可编辑；真实加床可指定归属病房。虚拟床不进入序列。
      </p>

      <Reorder.Group
        axis="y"
        values={units}
        onReorder={(next) => save(next as RoundingUnit[])}
        className="space-y-2"
      >
        {units.map((u, i) => (
          <Reorder.Item
            key={i}
            value={u}
            className="card flex items-start gap-2 p-3"
          >
            <GripVertical size={18} className="mt-1 shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              {u.kind === "room" ? (
                <>
                  <p className="text-[12px] font-medium text-primary">病房块</p>
                  <input
                    className="input mt-1 py-2 text-[13px]"
                    placeholder="床号以空格分隔，如 309W01 309W02 309W03"
                    value={u.beds.join(" ")}
                    onChange={(e) =>
                      updateUnit(i, {
                        kind: "room",
                        ward:
                          e.target.value.trim().split(/\s+/)[0]?.replace(
                            /\d+$/,
                            ""
                          ) ?? "",
                        beds: e.target.value
                          .trim()
                          .split(/\s+/)
                          .filter(Boolean),
                      })
                    }
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
                      onChange={(e) => updateUnit(i, { bed: e.target.value })}
                    />
                    <input
                      className="input py-2 text-[13px]"
                      placeholder="归属病房 如 309W41-43"
                      value={u.room}
                      onChange={(e) => updateUnit(i, { room: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>
            <button
              aria-label="删除"
              onClick={() => removeUnit(i)}
              className="rounded-lg p-1.5 text-danger hover:bg-danger/10"
            >
              <X size={18} />
            </button>
          </Reorder.Item>
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
