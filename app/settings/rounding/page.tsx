"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, X, Plus, RotateCcw, Wand2, ChevronDown } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getSettings,
  updateSettings,
  defaultRoundingOrder,
  db,
} from "@/lib/db";
import {
  expandRange,
  inferRoomRange,
  listWards,
  listExtraRealBeds,
  roomLabels,
  unitsFromText,
  buildDraftFromPatients,
} from "@/lib/rounding-edit";
import { RoundingUnit } from "@/types";
import { useApp } from "@/components/Providers";

export default function RoundingPage() {
  const { toast } = useApp();
  const settings = useLiveQuery(() => getSettings(), []);
  const patients = useLiveQuery(() => db.patients.toArray(), []);
  const [units, setUnits] = useState<RoundingUnit[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [text, setText] = useState("");
  const inited = useRef(false);

  // 仅初始化一次：从 DB 读取，并为缺失 id 的旧数据补 id（一次性迁移）。
  useEffect(() => {
    if (!settings || inited.current) return;
    inited.current = true;
    const raw = settings.roundingOrder ?? [];
    const missing = raw.some((u) => !("id" in u) || !(u as RoundingUnit).id);
    const fixed = raw.map((u) =>
      "id" in u && (u as RoundingUnit).id
        ? (u as RoundingUnit)
        : ({ ...(u as RoundingUnit), id: crypto.randomUUID() } as RoundingUnit)
    );
    setUnits(fixed);
    if (missing) updateSettings({ roundingOrder: fixed });
  }, [settings]);

  const save = (next: RoundingUnit[]) => {
    setUnits(next);
    updateSettings({ roundingOrder: next });
  };

  const wards = useMemo(() => listWards(patients ?? []), [patients]);
  const extraBeds = useMemo(() => listExtraRealBeds(patients ?? []), [patients]);
  const labels = useMemo(() => roomLabels(units), [units]);

  const updateUnit = (next: RoundingUnit) => {
    save(units.map((u) => (u.id === next.id ? next : u)));
  };

  const removeUnit = (id: string) => {
    save(units.filter((u) => u.id !== id));
  };

  const addRoom = () => {
    const ward = wards[0] ?? "309W";
    save([...units, { id: crypto.randomUUID(), kind: "room", ward, beds: expandRange(ward, 1, 1) }]);
  };
  const addExtra = () => {
    save([
      ...units,
      {
        id: crypto.randomUUID(),
        kind: "extra-real",
        bed: extraBeds[0] ?? "",
        room: labels[0] ?? wards[0] ?? "",
      },
    ]);
  };

  const reset = () => {
    const def = defaultRoundingOrder();
    setUnits(def);
    updateSettings({ roundingOrder: def });
    toast({ message: "已重置为内置示例" });
  };

  const generateFromPatients = () => {
    const draft = buildDraftFromPatients(patients ?? []);
    if (!draft.length) {
      toast({ message: "病人库为空，无法生成" });
      return;
    }
    save(draft);
    toast({ message: `已按病人库生成 ${draft.length} 个单元` });
  };

  const applyAdvanced = () => {
    const next = unitsFromText(text);
    if (!next.length) {
      toast({ message: "未解析到有效床号" });
      return;
    }
    save(next);
    setText("");
    setShowAdvanced(false);
    toast({ message: `已导入 ${next.length} 个单元` });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold text-main">查房顺序</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={generateFromPatients}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] text-primary hover:bg-surface-alt"
          >
            <Wand2 size={16} /> 按病人库生成
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] text-muted hover:bg-surface-alt"
          >
            <RotateCcw size={16} /> 重置示例
          </button>
        </div>
      </div>

      <p className="text-[12px] text-muted">
        拖动卡片左侧手柄调整顺序。病房块用「病区 + 床号范围」设置，真实加床从已识别清单选择，无需手输床号串。
      </p>

      {(!wards.length || !extraBeds.length) && (
        <p className="rounded-lg bg-surface-alt px-3 py-2 text-[12px] text-warning">
          病人库暂无已识别的病区/真实加床，清单选择为空。可先在「床号识别」与「导入病人」后使用，或用下方高级文本输入。
        </p>
      )}

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
        {units.map((u) =>
          u.kind === "room" ? (
            <RoomRow
              key={u.id}
              u={u}
              wards={wards}
              onUpdate={updateUnit}
              onRemove={() => removeUnit(u.id)}
            />
          ) : (
            <ExtraRow
              key={u.id}
              u={u}
              extraBeds={extraBeds}
              labels={labels}
              onUpdate={updateUnit}
              onRemove={() => removeUnit(u.id)}
            />
          )
        )}
      </Reorder.Group>

      <div className="flex gap-2 pt-2">
        <button className="btn-secondary h-11 flex-1" onClick={addRoom}>
          <Plus size={16} /> 添加病房块
        </button>
        <button className="btn-secondary h-11 flex-1" onClick={addExtra}>
          <Plus size={16} /> 添加真实加床
        </button>
      </div>

      <div className="rounded-xl border border-border/60 bg-card">
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-[13px] font-medium text-primary"
        >
          高级：文本批量输入
          <ChevronDown
            size={16}
            className={`transition ${showAdvanced ? "rotate-180" : ""}`}
          />
        </button>
        {showAdvanced && (
          <div className="space-y-2 border-t border-border/60 p-3">
            <textarea
              className="input min-h-[96px] py-2 text-[13px]"
              placeholder={"每行一个床号，保存时按行生成单元（相邻真实床自动成组为一个病房块）\n309W01\n309W02\n309WJ04"}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="btn-primary h-10 w-full" onClick={applyAdvanced}>
              解析并覆盖当前顺序
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DragHandle() {
  const controls = useDragControls();
  return (
    <span
      onPointerDown={(e) => controls.start(e)}
      aria-label="拖拽排序"
      className="mt-1 shrink-0 cursor-grab touch-none select-none text-muted active:cursor-grabbing"
    >
      <GripVertical size={18} />
    </span>
  );
}

function RoomRow({
  u,
  wards,
  onUpdate,
  onRemove,
}: {
  u: Extract<RoundingUnit, { kind: "room" }>;
  wards: string[];
  onUpdate: (next: RoundingUnit) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const range = inferRoomRange(u.beds);
  const wardOptions = wards.includes(u.ward) ? wards : [u.ward, ...wards];
  const start = range?.start ?? 1;
  const end = range?.end ?? 1;

  const commit = (ward: string, s: number, e: number) => {
    onUpdate({ id: u.id, kind: "room", ward, beds: expandRange(ward, s, e) });
  };

  return (
    <Reorder.Item
      value={u.id}
      dragListener={false}
      dragControls={controls}
      className="card flex items-start gap-2 p-3"
    >
      <DragHandle />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-primary">病房块</p>
        <div className="mt-1 grid grid-cols-[1fr_auto_auto] items-center gap-2">
          <select
            className="input py-2 text-[13px]"
            value={u.ward}
            onChange={(e) => commit(e.target.value, start, end)}
          >
            {wardOptions.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            className="input w-16 py-2 text-center text-[13px]"
            value={start}
            onChange={(e) => commit(u.ward, Number(e.target.value || 1), end)}
            aria-label="起始床号"
          />
          <span className="text-muted">–</span>
          <input
            type="number"
            min={1}
            className="input w-16 py-2 text-center text-[13px] col-start-3 row-start-1"
            value={end}
            onChange={(e) => commit(u.ward, start, Number(e.target.value || 1))}
            aria-label="结束床号"
          />
        </div>
        <p className="mt-2 text-[12px] text-muted">
          {range
            ? `${u.ward}${String(start).padStart(2, "0")} – ${
                u.ward
              }${String(end).padStart(2, "0")}（共 ${u.beds.length} 床）`
            : "预览不可用（跨病区或非连续），建议用高级文本输入"}
        </p>
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

function ExtraRow({
  u,
  extraBeds,
  labels,
  onUpdate,
  onRemove,
}: {
  u: Extract<RoundingUnit, { kind: "extra-real" }>;
  extraBeds: string[];
  labels: string[];
  onUpdate: (next: RoundingUnit) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const bedOptions = extraBeds.includes(u.bed) ? extraBeds : [u.bed, ...extraBeds];
  const roomOptions = labels.includes(u.room) ? labels : [u.room, ...labels];

  return (
    <Reorder.Item
      value={u.id}
      dragListener={false}
      dragControls={controls}
      className="card flex items-start gap-2 p-3"
    >
      <DragHandle />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-primary">真实加床</p>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <select
            className="input py-2 text-[13px]"
            value={u.bed}
            onChange={(e) => onUpdate({ ...u, bed: e.target.value })}
          >
            {bedOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            className="input py-2 text-[13px]"
            value={u.room}
            onChange={(e) => onUpdate({ ...u, room: e.target.value })}
          >
            {roomOptions.map((r) => (
              <option key={r} value={r}>
                {r || "（未指定）"}
              </option>
            ))}
          </select>
        </div>
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
