"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, ClipboardList, ArrowUpDown } from "lucide-react";
import { db, getSettings, deletePatient, todayStr, updateSettings } from "@/lib/db";
import { resolveOrder } from "@/lib/rounding";
import { computeReminders, patientStatus, pendingTodoCount, PatientStatus } from "@/lib/reminders";
import { buildDailySummary } from "@/lib/summary";
import { Patient, BedType } from "@/types";
import { parseBed } from "@/lib/bed-parser";

import PatientCard from "@/components/PatientCard";
import GroupedPatientCard, { GroupedItem } from "@/components/GroupedPatientCard";
import ReminderBar from "@/components/ReminderBar";
import DailySummaryCard from "@/components/DailySummary";
import GroupFilter from "@/components/GroupFilter";
import EmptyState from "@/components/EmptyState";
import AddPatientSheet from "@/components/AddPatientSheet";
import TodoFormSheet from "@/components/TodoFormSheet";
import PatientFormSheet from "@/components/PatientFormSheet";
import BottomSheet from "@/components/BottomSheet";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useApp } from "@/components/Providers";

export default function HomePage() {
  const router = useRouter();
  const { toast } = useApp();

  const patientsQuery = useLiveQuery(() => db.patients.toArray(), []);
  const patients = patientsQuery ?? [];
  const todosQuery = useLiveQuery(() => db.todos.toArray(), []);
  const todos = todosQuery ?? [];
  const settings = useLiveQuery(() => getSettings(), []);
  // 切回首页时 useLiveQuery 首帧返回 undefined，需与「真的为空」区分，
  // 否则会闪一下「暂无病人」被误认为数据丢失。
  const loading = patientsQuery === undefined || settings === undefined;

  const [group, setGroup] = useState<string | null>(null);

  // 首页病人列表的展示方向（正/反序），与查房顺序设置解耦，持久化到 settings。
  const listDirection = settings?.listDirection ?? "forward";
  const setListDirection = (dir: "forward" | "reverse") =>
    updateSettings({ listDirection: dir });

  const [addOpen, setAddOpen] = useState(false);
  const [todoOpen, setTodoOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [menuPatient, setMenuPatient] = useState<Patient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);

  const today = todayStr();

  // restore scroll position when returning from detail
  useEffect(() => {
    const y = sessionStorage.getItem("homeScroll");
    if (y) window.scrollTo(0, parseInt(y, 10));
  }, []);

  const groups = useMemo(
    () => Array.from(new Set(patients.map((p) => p.group).filter(Boolean))) as string[],
    [patients]
  );

  const ordered = useMemo(() => {
    if (!settings) return [];
    const base = resolveOrder(settings.roundingOrder, patients);
    return listDirection === "reverse" ? [...base].reverse() : base;
  }, [patients, settings, listDirection]);

  // 将有序序列按「病房块」连续分组（grouped card，PRD 4.1.1 / 4.9.3）。
  const rows = useMemo(() => {
    type Row =
      | { type: "group"; id: string; label: string; items: GroupedItem[] }
      | { type: "single"; patient: Patient; todoCount: number; status: PatientStatus };
    const out: Row[] = [];
    let cur: { id: string; label: string; items: GroupedItem[] } | null = null;
    for (const op of ordered) {
      const todoCount = pendingTodoCount(op.patient, todos);
      const status = patientStatus(op.patient, todos, today);
      if (op.groupId) {
        if (cur && cur.id === op.groupId) {
          cur.items.push({ patient: op.patient, todoCount, status });
        } else {
          cur = {
            id: op.groupId,
            label: op.groupLabel ?? "",
            items: [{ patient: op.patient, todoCount, status }],
          };
          out.push({ type: "group", ...cur });
        }
      } else {
        cur = null;
        out.push({ type: "single", patient: op.patient, todoCount, status });
      }
    }
    return out;
  }, [ordered, todos, today]);

  const filtered = useMemo(
    () =>
      rows.filter((g) =>
        g.type === "single"
          ? group === null || g.patient.group === group
          : g.items.some((it) => group === null || it.patient.group === group)
      ),
    [rows, group]
  );

  const reminders = useMemo(
    () => computeReminders(patients, todos, today),
    [patients, todos, today]
  );

  const summary = useMemo(
    () => buildDailySummary(todos, patients, today),
    [todos, patients, today]
  );

  // 实时解析床号，得到每个病人的床型与特殊标记，用于列表卡片标识特殊类型床（加床 / 虚拟）。
  const bedInfoMap = useMemo(() => {
    const m = new Map<string, { bedType: BedType; specialType: string }>();
    if (!settings) return m;
    for (const p of patients) {
      const r = parseBed(p.bedNumber, settings.bedTemplate, settings.specialMarks);
      m.set(p.id, { bedType: r.bedType, specialType: r.specialType });
    }
    return m;
  }, [patients, settings]);

  const openDetail = (p: Patient) => {
    sessionStorage.setItem("homeScroll", String(window.scrollY));
    router.push(`/patient/${p.id}`);
  };

  const onReminderClick = () => {
    router.push(
      reminders.overdueTodos > 0
        ? "/todos?filter=overdue"
        : "/todos?filter=today"
    );
  };

  const doDelete = async (p: Patient) => {
    const ptodos = todos.filter((t) => t.patientId === p.id);
    await deletePatient(p.id);
    toast({
      message: "已删除 · 撤销",
      actionLabel: "撤销",
      onAction: async () => {
        await db.patients.add(p);
        if (ptodos.length) await db.todos.bulkAdd(ptodos);
        toast({ message: "已恢复" });
      },
    });
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold text-main">查房</h1>
        <div className="flex gap-2">
          <button
            className="btn-secondary h-10 px-3 text-[13px]"
            onClick={() => setAddOpen(true)}
          >
            <Plus size={16} /> 添加病人
          </button>
          <button
            className="btn-secondary h-10 px-3 text-[13px]"
            onClick={() => setTodoOpen(true)}
          >
            <ClipboardList size={16} /> 通用待办
          </button>
        </div>
      </header>

      <ReminderBar summary={reminders} onClick={onReminderClick} />

      <DailySummaryCard
        summary={summary}
        onCopy={async () => {
          await navigator.clipboard.writeText(summary.text);
          toast({ message: "小结已复制" });
        }}
        onExport={() => {
          const d = new Date();
          const f = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          const blob = new Blob([JSON.stringify({
            date: summary.date,
            dressing: summary.dressing,
            bloodTest: summary.bloodTest,
            patients: summary.patients,
            general: summary.general,
          }, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${f}-summary.json`;
          a.click();
          URL.revokeObjectURL(url);
        }}
      />

      <GroupFilter groups={groups} selected={group} onChange={setGroup} />

      {/* 列表顺序：正序/反序（首页病人列表展示，不改动查房顺序设置） */}
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted">列表顺序</span>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-alt p-1">
          {(["forward", "reverse"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setListDirection(d)}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition ${
                listDirection === d
                  ? "bg-primary text-white"
                  : "text-muted"
              }`}
            >
              <ArrowUpDown size={13} />
              {d === "forward" ? "正序" : "反序"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={loading ? "加载中…" : patients.length === 0 ? "暂无病人" : "未找到匹配病人"}
          hint={
            loading
              ? "正在读取本地数据…"
              : patients.length === 0
                ? "点击右上角添加或批量导入"
                : "试试切换分组筛选"
          }
        />
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {filtered.map((g) =>
              g.type === "group" ? (
                <GroupedPatientCard
                  key={g.id}
                  label={g.label}
                  items={g.items}
                  bedInfoMap={bedInfoMap}
                  onOpen={openDetail}
                  onMenu={(patient) => setMenuPatient(patient)}
                />
              ) : (
                <PatientCard
                  key={g.patient.id}
                  patient={g.patient}
                  todoCount={g.todoCount}
                  status={g.status}
                  bedType={bedInfoMap.get(g.patient.id)?.bedType}
                  specialType={bedInfoMap.get(g.patient.id)?.specialType}
                  onOpen={openDetail}
                  onMenu={(patient) => setMenuPatient(patient)}
                />
              )
            )}
          </AnimatePresence>
        </div>
      )}

      <AddPatientSheet open={addOpen} onClose={() => setAddOpen(false)} />

      <TodoFormSheet
        open={todoOpen}
        onClose={() => setTodoOpen(false)}
        patientId={null}
      />

      <PatientFormSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        patient={menuPatient}
      />

      <BottomSheet
        open={!!menuPatient}
        onClose={() => setMenuPatient(null)}
        title="操作"
      >
        <div className="space-y-2">
          <button
            className="btn-secondary h-12 w-full"
            onClick={() => {
              setEditOpen(true);
              setMenuPatient(null);
            }}
          >
            编辑 / 更改分组
          </button>
          <button
            className="h-12 w-full rounded-xl bg-danger/10 text-[14px] font-medium text-danger"
            onClick={() => {
              setDeleteTarget(menuPatient);
              setMenuPatient(null);
            }}
          >
            删除病人
          </button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除病人？"
        message={
          deleteTarget
            ? `将删除 ${deleteTarget.name} 及其全部待办（可在 5 秒内撤销）。`
            : ""
        }
        confirmText="删除"
        danger
        onConfirm={() => {
          if (deleteTarget) doDelete(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
