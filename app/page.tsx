"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, ClipboardList } from "lucide-react";
import { db, getSettings, deletePatient, todayStr } from "@/lib/db";
import { sortPatients } from "@/lib/rounding";
import { matchPatient } from "@/lib/pinyin";
import { computeReminders, patientStatus, pendingTodoCount } from "@/lib/reminders";
import { buildDailySummary } from "@/lib/summary";
import { Patient } from "@/types";

import PatientCard from "@/components/PatientCard";
import ReminderBar from "@/components/ReminderBar";
import DailySummaryCard from "@/components/DailySummary";
import SearchBar from "@/components/SearchBar";
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

  const patients = useLiveQuery(() => db.patients.toArray(), []) ?? [];
  const todos = useLiveQuery(() => db.todos.toArray(), []) ?? [];
  const settings = useLiveQuery(() => getSettings(), []);

  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);

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

  const sorted = useMemo(() => {
    if (!settings) return patients;
    return sortPatients(patients, settings.roundingOrder);
  }, [patients, settings]);

  const filtered = useMemo(
    () =>
      sorted.filter(
        (p) =>
          matchPatient(p, query) && (group === null || p.group === group)
      ),
    [sorted, query, group]
  );

  const reminders = useMemo(
    () => computeReminders(patients, todos, today),
    [patients, todos, today]
  );

  const summary = useMemo(
    () => buildDailySummary(todos, patients, today),
    [todos, patients, today]
  );

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

      <SearchBar value={query} onChange={setQuery} />
      <GroupFilter groups={groups} selected={group} onChange={setGroup} />

      {filtered.length === 0 ? (
        <EmptyState
          title={patients.length === 0 ? "暂无病人" : "未找到匹配病人"}
          hint={patients.length === 0 ? "点击右上角添加或批量导入" : "试试其他关键词或清空筛选"}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <PatientCard
              key={p.id}
              patient={p}
              todoCount={pendingTodoCount(p, todos)}
              status={patientStatus(p, todos, today)}
              onOpen={openDetail}
              onMenu={(patient) => setMenuPatient(patient)}
            />
          ))}
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
