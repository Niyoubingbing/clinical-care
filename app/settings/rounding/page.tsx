"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, X, Plus, RotateCcw, Wand2, ChevronDown, Layers } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getSettings,
  updateSettings,
  defaultRoundingOrder,
  db,
} from "@/lib/db";
import { parseBed } from "@/lib/bed-parser";
import {
  expandRange,
  inferRoomRange,
  listWards,
  listExtraRealBeds,
  roomLabels,
  unitsFromText,
  buildDraftFromPatients,
  buildWardDraft,
  wardOfUnit,
} from "@/lib/rounding-edit";
import { RoundingUnit } from "@/types";
import { useApp } from "@/components/Providers";

export default function RoundingPage() {
  const { toast } = useApp();
  const settings = useLiveQuery(() => getSettings(), []);
  const patients = useLiveQuery(() => db.patients.toArray(), []);
  const [units, setUnits] = useState<RoundingUnit[]>([]);
  const [activeWard, setActiveWard] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [text, setText] = useState("");
  const inited = useRef(false);

  // 仅初始化一次：从 DB 读取，并为缺失 id 的旧数据补 id（一次性迁移）。
  useEffect(() => {
    if (!settings || inited.current) return;
    inited.current = true;
    const raw = settings.roundingOrder ?? [];
    const fixed = raw.map((u) =>
      "id" in u && (u as RoundingUnit).id
        ? (u as RoundingUnit)
        : ({ ...(u as RoundingUnit), id: crypto.randomUUID() } as RoundingUnit)
    );
    setUnits(fixed);
    if (raw.some((u) => !("id" in u) || !(u as RoundingUnit).id))
      updateSettings({ roundingOrder: fixed });
  }, [settings]);

  const save = (next: RoundingUnit[]) => {
    setUnits(next);
    updateSettings({ roundingOrder: next });
  };

  const wards = useMemo(() => listWards(patients ?? []), [patients]);
  const extraBeds = useMemo(() => listExtraRealBeds(patients ?? []), [patients]);

  // 所有出现过病区（病人库 + 现有序列），按字母序；用于顶部 tabs。
  const allWards = useMemo(() => {
    const set = new Set<string>(wards);
    for (const u of units) set.add(wardOfUnit(u));
    return [...set].sort((a, b) => a.localeCompare(b, "zh"));
  }, [wards, units]);

  // 初次进入默认选中第一个病区。
  useEffect(() => {
    if (!activeWard && allWards.length) setActiveWard(allWards[0]);
  }, [allWards, activeWard]);

  // 当前病区可见片段（病区之间不交叉）。
  const visible = useMemo(
    () => units.filter((u) => wardOfUnit(u) === activeWard),
    [units, activeWard]
  );
  const labels = useMemo(() => roomLabels(visible), [visible]);
  const wardExtras = useMemo(
    () => extraBeds.filter((b) => parseBed(b).ward === activeWard),
    [extraBeds, activeWard]
  );

  const updateUnit = (next: RoundingUnit) =>
    save(units.map((u) => (u.id === next.id ? next : u)));
  const removeUnit = (id: string) =>
    save(units.filter((u) => u.id !== id));

  // 拖拽仅在「当前病区视图」内重排；其他病区片段保持原位（不交叉、不丢失）。
  const onReorder = (ids: string[]) => {
    const idSet = new Set(visible.map((u) => u.id));
    const byId = new Map(units.map((u) => [u.id, u]));
    const reordered = ids
      .map((id) => byId.get(id))
      .filter((u): u is RoundingUnit => Boolean(u));
    let i = 0;
    const next = units.map((u) => (idSet.has(u.id) ? reordered[i++] : u));
    save(next);
  };

  // 一键按基础床号填充本病区（无需手输）。
  const fillWard = () => {
    if (!activeWard) return;
    const draft = buildWardDraft(patients ?? [], activeWard);
    if (!draft.length) {
      toast({ message: `本病区（${activeWard}）暂无已识别病人` });
      return;
    }
    const idSet = new Set(
      units.filter((u) => wardOfUnit(u) === activeWard).map((u) => u.id)
    );
    const others = units.filter((u) => !idSet.has(u.id));
    const idx = units.findIndex((u) => wardOfUnit(u) === activeWard);
    const insertAt = idx === -1 ? others.length : idx;
    const next = [...others];
    next.splice(insertAt, 0, ...draft);
    save(next);
    toast({ message: `已按基础床号填充 ${activeWard}（${draft.length} 个单元）` });
  };

  const addRoom = () => {
    const ward = activeWard || wards[0] || "309W";
    save([
      ...units,
      {
        id: crypto.randomUUID(),
        kind: "room",
        ward,
        beds: expandRange(ward, 1, 1),
      },
    ]);
  };
  const addExtra = () => {
    const ward = activeWard || wards[0] || "309W";
    save([
      ...units,
      {
        id: crypto.randomUUID(),
        kind: "extra-real",
        bed: wardExtras[0] ?? "",
        room: labels[0] ?? ward,
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
    const ward = activeWard || wards[0] || "309W";
    const idSet = new Set(
      units.filter((u) => wardOfUnit(u) === ward).map((u) => u.id)
    );
    const others = units.filter((u) => !idSet.has(u.id));
    const idx = units.findIndex((u) => wardOfUnit(u) === ward);
    const insertAt = idx === -1 ? others.length : idx;
    const merged = [...others];
    merged.splice(insertAt, 0, ...next);
    save(merged);
    setText("");
    setShowAdvanced(false);
    toast({ message: `已导入 ${next.length} 个单元到 ${ward}` });
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
        按病区单独设置，病区之间不交叉。选中病区后，点「填充本病区」即可按已解析的基础床号自动生成病房块与真实加床，无需手输。
      </p>

      {allWards.length === 0 ? (
        <p className="rounded-lg bg-surface-alt px-3 py-2 text-[12px] text-warning">
          尚未识别到任何病区。请先在「床号识别」与「导入病人」后使用，或用下方高级文本输入。
        </p>
      ) : (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {allWards.map((w) => (
            <button
              key={w}
              onClick={() => setActiveWard(w)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
                w === activeWard
                  ? "bg-primary text-white"
                  : "bg-surface-alt text-muted hover:text-main"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      )}

      {activeWard && (
        <button onClick={fillWard} className="btn-primary h-11 w-full">
          <Layers size={16} /> 填充本病区（{activeWard}）
        </button>
      )}

      {activeWard && visible.length === 0 && (
        <p className="rounded-lg bg-surface-alt px-3 py-2 text-[12px] text-muted">
          本病区（{activeWard}）暂无查房单元。点上方「填充本病区」自动生成，或手动添加。
        </p>
      )}

      <Reorder.Group
        axis="y"
        values={visible.map((u) => u.id)}
        onReorder={onReorder}
        className="space-y-2"
      >
        {visible.map((u) =>
          u.kind === "room" ? (
            <RoomRow
              key={u.id}
              u={u}
              onUpdate={updateUnit}
              onRemove={() => removeUnit(u.id)}
            />
          ) : (
            <ExtraRow
              key={u.id}
              u={u}
              extraBeds={wardExtras}
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
          高级：文本批量输入（仅当前病区 {activeWard}）
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
              解析并覆盖本病区顺序
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
  onUpdate,
  onRemove,
}: {
  u: Extract<RoundingUnit, { kind: "room" }>;
  onUpdate: (next: RoundingUnit) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const { toast } = useApp();
  const range = inferRoomRange(u.beds);
  const start = range?.start ?? 1;
  const end = range?.end ?? 1;

  // 防误输护栏（非业务上限）：单病区床位数通常数百内，超此视为输入异常。
  const MAX_BEDS = 2000;
  const commit = (s: number, e: number) => {
    if (Math.abs(e - s) + 1 > MAX_BEDS) {
      toast({ message: `床号跨度过大（${Math.abs(e - s) + 1} 床），请检查输入` });
      return;
    }
    onUpdate({ id: u.id, kind: "room", ward: u.ward, beds: expandRange(u.ward, s, e) });
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
        <p className="text-[12px] font-medium text-primary">病房块 · {u.ward}</p>
        <div className="mt-1 grid grid-cols-[1fr_auto_auto] items-center gap-2">
          <span className="input py-2 text-[13px] text-muted">{u.ward}</span>
          <input
            type="number"
            min={1}
            className="input w-16 py-2 text-center text-[13px]"
            value={start}
            onChange={(e) => commit(Number(e.target.value || 1), end)}
            aria-label="起始床号"
          />
          <span className="text-muted">–</span>
          <input
            type="number"
            min={1}
            className="input w-16 py-2 text-center text-[13px] col-start-3 row-start-1"
            value={end}
            onChange={(e) => commit(start, Number(e.target.value || 1))}
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
        <p className="mt-0.5 text-[11px] text-muted/70">
          床号范围自定义，无数量上限（按实际病区床位填写）
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
