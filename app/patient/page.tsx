"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { db, getSettings, deletePatient, updatePatient, toggleTodo, deleteTodo, todayStr } from "@/lib/db";
import { Todo } from "@/types";
import { dueLabel } from "@/lib/time-parser";
import { patientStatus } from "@/lib/reminders";
import { contrastTextColor, bedBlockLabel } from "@/lib/contrast";
import { parseBed } from "@/lib/bed-parser";

import QuickActions from "@/components/QuickActions";
import QuickTodoBar from "@/components/QuickTodoBar";
import { TodoListView } from "@/components/TodoListView";
import TodoFormSheet from "@/components/TodoFormSheet";
import PatientFormSheet from "@/components/PatientFormSheet";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
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
  const router = useRouter();
  const { toast } = useApp();

  // 病人 id 来自客户端 store（sessionStorage 'cc:pid'），而非 URL 参数。
  // 这样 /patient 是真正的预渲染静态文件，SW 在 install 阶段即可预缓存，
  // 离线打开任意病人（含断网后新导入的）都稳，且客户端导航是平滑软导航。
  const [patientId, setPatientId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const pid =
      typeof window !== "undefined"
        ? sessionStorage.getItem("cc:pid")
        : null;
    setPatientId(pid);
    setReady(true);
  }, []);

  const patient = useLiveQuery(
    () => (patientId ? db.patients.get(patientId) : undefined),
    [patientId]
  );
  const todos = useLiveQuery(
    () => (patientId ? db.todos.where("patientId").equals(patientId).toArray() : []),
    [patientId]
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

  const customGroups = settings?.customGroups ?? [];

  // 详情页一键切换分组（设置页自定义的分组）。
  const switchGroup = useCallback(
    async (g: { name: string; color: string } | null) => {
      if (!patientId) return;
      await updatePatient(patientId, {
        group: g?.name,
        groupColor: g?.color,
        updatedAt: Date.now(),
      });
      toast({
        message: g ? `已切换到「${g.name}」` : "已取消分组",
      });
    },
    [patientId, toast]
  );

  const onToggle = useCallback(
    async (t: Todo) => {
      await toggleTodo(t.id, t.status !== "completed");
    },
    []
  );

  const onDelete = useCallback(
    async (t: Todo) => {
      await deleteTodo(t.id);
      toast({
        message: "已删除 · 撤销",
        actionLabel: "撤销",
        onAction: async () => {
          await db.todos.add(t);
          toast({ message: "已恢复" });
        },
      });
    },
    [toast]
  );

  const passFilter = useCallback(() => true, []);

  if (!ready) {
    // 首屏（含静态预渲染）先不渲染内容，待挂载后从 sessionStorage 读取 id，避免水合不一致。
    return null;
  }

  if (!patientId) {
    return (
      <EmptyState
        title="未选择病人"
        hint="请从查房页选择一个病人查看详情"
      />
    );
  }

  if (!patient) {
    return (
      <div className="space-y-4">
        <header className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-surface-alt" />
          <div className="h-5 w-32 rounded bg-surface-alt" />
        </header>
        <div className="card p-4">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 shrink-0 rounded-lg bg-surface-alt" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-surface-alt" />
              <div className="h-3 w-24 rounded bg-surface-alt" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-y-1.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-2">
                <div className="h-3 w-16 rounded bg-surface-alt" />
                <div className="h-3 w-20 rounded bg-surface-alt" />
              </div>
            ))}
          </div>
        </div>
        <div className="card h-20 p-4" />
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-surface-alt" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card h-14" />
          ))}
        </div>
      </div>
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

      {/* 详情页一键切换分组（设置页自定义的分组列表） */}
      {customGroups.length > 0 && (
        <div>
          <p className="mb-2 text-[13px] font-medium text-muted">切换分组</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => switchGroup(null)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] ${
                !patient.group
                  ? "border-primary text-primary"
                  : "border-border/60 text-muted"
              }`}
            >
              无
            </button>
            {customGroups.map((g) => {
              const active = patient.group === g.name;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => switchGroup({ name: g.name, color: g.color })}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition ${
                    active
                      ? "border-primary text-primary"
                      : "border-border/60 text-muted"
                  }`}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: g.color }}
                  />
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <QuickActions patientId={patient.id} onAddTodo={() => setTodoOpen(true)} />

      <div>
        <p className="mb-2 text-[13px] font-medium text-muted">快捷待办</p>
        <QuickTodoBar patientId={patient.id} />
      </div>

      <div>
        <p className="mb-2 text-[13px] font-medium text-muted">待办</p>
        <TodoListView
          list={list}
          passFilter={passFilter}
          onToggle={onToggle}
          onDelete={onDelete}
          patient={patient}
        />
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
