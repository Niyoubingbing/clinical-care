"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { db, getSettings, deletePatient, toggleTodo, deleteTodo, todayStr } from "@/lib/db";
import { Todo } from "@/types";
import { dueLabel } from "@/lib/time-parser";
import { patientStatus } from "@/lib/reminders";
import { contrastTextColor, bedBlockLabel } from "@/lib/contrast";
import { parseBed } from "@/lib/bed-parser";

import QuickActions from "@/components/QuickActions";
import QuickTodoBar from "@/components/QuickTodoBar";
import SwipeableTodo from "@/components/SwipeableTodo";
import TodoFormSheet from "@/components/TodoFormSheet";
import PatientFormSheet from "@/components/PatientFormSheet";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useApp } from "@/components/Providers";

function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    const da = a.dueDate ?? "9999-99-99";
    const db2 = b.dueDate ?? "9999-99-99";
    if (da !== db2) return da < db2 ? -1 : 1;
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
}

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useApp();
  const id = String(params.id);

  const patient = useLiveQuery(() => db.patients.get(id), [id]);
  const todos = useLiveQuery(
    () => db.todos.where("patientId").equals(id).toArray(),
    [id]
  );
  const settings = useLiveQuery(() => getSettings(), []);

  const [todoOpen, setTodoOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const today = todayStr();
  const list = sortTodos(todos ?? []);
  const status = patient ? patientStatus(patient, todos ?? [], today) : null;

  // 解析当前病人床号，用于详情页头部标识特殊类型床（加床 / 虚拟）。
  const parsedBed = useMemo(
    () => (settings && patient ? parseBed(patient.bedNumber, settings.bedTemplate, settings.specialMarks) : null),
    [settings, patient]
  );

  const onToggle = async (t: Todo) => {
    await toggleTodo(t.id, t.status !== "completed");
  };

  const onDelete = async (t: Todo) => {
    await deleteTodo(t.id);
    toast({
      message: "已删除 · 撤销",
      actionLabel: "撤销",
      onAction: async () => {
        await db.todos.add(t);
        toast({ message: "已恢复" });
      },
    });
  };

  if (!patient) {
    return (
      <div className="py-20 text-center text-muted">加载中…</div>
    );
  }

  const color = patient.groupColor || "#e2e8f0";

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <button
          aria-label="返回"
          onClick={() => router.back()}
          className="rounded-lg p-1.5 text-muted hover:bg-surface-alt"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[18px] font-semibold text-main">
            {patient.name}
          </h1>
          {patient.group && (
            <span className="text-[12px] text-muted">{patient.group}</span>
          )}
        </div>
        <button
          aria-label="编辑"
          onClick={() => setEditOpen(true)}
          className="rounded-lg p-2 text-muted hover:bg-surface-alt"
        >
          <Pencil size={18} />
        </button>
      </header>

      <div className="card p-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-[15px] font-bold"
            style={{ backgroundColor: color, color: contrastTextColor(color) }}
          >
            {bedBlockLabel(patient.bedNumber)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-main">
              {patient.bedNumber} · {patient.diagnosis}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {parsedBed?.bedType === "virtual" && (
                <span className="badge-virtual">虚拟床</span>
              )}
              {parsedBed?.bedType === "extra-real" && (
                <span className="badge-special">
                  {parsedBed.specialType ? `加床·${parsedBed.specialType}` : "加床"}
                </span>
              )}
              {status?.needDressing && <span className="badge-danger">需换药</span>}
              {status?.needBlood && <span className="badge-warning">需查血</span>}
              {status?.overdue && <span className="badge-danger">有逾期待办</span>}
            </div>
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-[12px]">
          <Info label="手术日期" value={patient.surgeryDate} />
          <Info label="换药频率" value={patient.dressingFrequency ? `${patient.dressingFrequency} 天` : undefined} />
          <Info label="上次换药" value={patient.lastDressingChange} />
          <Info label="查血日" value={patient.bloodTestDay} />
        </dl>
      </div>

      <QuickActions patientId={patient.id} onAddTodo={() => setTodoOpen(true)} />

      <div>
        <p className="mb-2 text-[13px] font-medium text-muted">快捷待办</p>
        <QuickTodoBar patientId={patient.id} />
      </div>

      <div>
        <p className="mb-2 text-[13px] font-medium text-muted">
          待办（{list.filter((t) => t.status === "pending").length} 进行中）
        </p>
        {list.length === 0 ? (
          <p className="rounded-xl bg-card/50 px-4 py-8 text-center text-[13px] text-muted">
            暂无待办
          </p>
        ) : (
          <div className="space-y-2">
            {list.map((t) => (
              <SwipeableTodo
                key={t.id}
                todo={t}
                onToggle={onToggle}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>

      <button
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13px] text-danger"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 size={16} /> 删除病人
      </button>

      <TodoFormSheet
        open={todoOpen}
        onClose={() => setTodoOpen(false)}
        patientId={patient.id}
        patientName={patient.name}
      />
      <PatientFormSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        patient={patient}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="删除病人？"
        message={`将删除 ${patient.name} 及其全部待办。`}
        confirmText="删除"
        danger
        onConfirm={async () => {
          const ptodos = (todos ?? []).filter((t) => t.patientId === patient.id);
          await deletePatient(patient.id);
          setDeleteOpen(false);
          toast({
            message: "已删除 · 撤销",
            actionLabel: "撤销",
            onAction: async () => {
              await db.patients.add(patient);
              if (ptodos.length) await db.todos.bulkAdd(ptodos);
              toast({ message: "已恢复" });
            },
          });
          router.back();
        }}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-main">{value ?? "—"}</dd>
    </div>
  );
}
