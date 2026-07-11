"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Plus, ClipboardList, ArrowUpDown } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSettings, deletePatient, todayStr, updateSettings } from "@/lib/db";
import { resolveOrder } from "@/lib/rounding";
import { computeReminders, patientStatus, pendingTodoCount, PatientStatus } from "@/lib/reminders";
import { buildDailySummary } from "@/lib/summary";
import { Patient, BedType, Todo } from "@/types";
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

const EMPTY_PATIENTS: Patient[] = [];
const EMPTY_TODOS: Todo[] = [];

export default function HomePage() {
  const router = useRouter();
  const { toast } = useApp();

  const patientsQuery = useLiveQuery(() => db.patients.toArray(), []);
  const patients = patientsQuery ?? EMPTY_PATIENTS;
  const todosQuery = useLiveQuery(() => db.todos.toArray(), []);
  const todos = todosQuery ?? EMPTY_TODOS;
  const settings = useLiveQuery(() => getSettings(), []);
  // 切回首页时 useLiveQuery 首帧返回 undefined，需与「真的为空」区分，
  // 否则会闪一下「暂无病人」被误认为数据丢失。
  const loading = patientsQuery === undefined || settings === undefined;

  const [group, setGroup] = useState<string | null>(null);

  // 首页病人列表的展示方向（正/反序），与查房顺序设置解耦，持久化到 settings。
  const listDirection = settings?.listDirection ?? "forward";
  const setListDirection = useCallback(
    (dir: "forward" | "reverse") => updateSettings({ listDirection: dir }),
    []
  );

  const [addOpen, setAddOpen] = useState(false);
  const [todoOpen, setTodoOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [menuPatient, setMenuPatient] = useState<Patient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);

  const today = todayStr();

  // 筛选分组列表：优先采用设置页自定义分组（保证空分组也可筛选），
  // 并合并实际病人中存在的分组，兼容未在设置中登记的分组名。
  const groups = useMemo(() => {
    const preset = (settings?.customGroups ?? []).map((g) => g.name);
    const fromPatients = Array.from(
      new Set(patients.map((p) => p.group).filter(Boolean))
    ) as string[];
    return Array.from(new Set([...preset, ...fromPatients]));
  }, [patients, settings]);

  const ordered = useMemo(() => {
    if (!settings) return [];
    const base = resolveOrder(settings.roundingOrder, patients);
    return listDirection === "reverse" ? [...base].reverse() : base;
  }, [patients, settings, listDirection]);

  // 将有序序列按「病房块」连续分组（grouped card，PRD 4.1.1 / 4.9.3）。
  const rows = useMemo(() => {
    type Row =
      | { type: "group"; id: string; items: GroupedItem[] }
      | { type: "single"; patient: Patient; todoCount: number; status: PatientStatus };
    const out: Row[] = [];
    let cur: { id: string; items: GroupedItem[] } | null = null;
    for (const op of ordered) {
      const todoCount = pendingTodoCount(op.patient, todos);
      const status = patientStatus(op.patient, todos, today);
      if (op.groupId) {
        if (cur && cur.id === op.groupId) {
          cur.items.push({ patient: op.patient, todoCount, status });
        } else {
          cur = {
            id: op.groupId,
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

  // 从详情页返回时恢复列表滚动位置。
  // 关键：patients 经 useLiveQuery 异步加载，首帧列表尚未渲染、页面很矮，
  // 若此刻 scrollTo 会落空（被 clamp 回顶部），造成「概率回到顶部」。
  // 因此必须等 loading=false 且列表节点渲染完成（双 rAF 布局稳定）后再恢复，且只做一次。
  const scrollRestored = useRef(false);
  const rafIds = useRef<number[]>([]);
  useEffect(() => {
    if (scrollRestored.current || loading) return;
    const raw = sessionStorage.getItem("homeScroll");
    const y = raw ? parseInt(raw, 10) : 0;
    if (!y) {
      scrollRestored.current = true;
      return;
    }
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(() => {
        window.scrollTo(0, y);
        scrollRestored.current = true;
        sessionStorage.removeItem("homeScroll");
      });
      rafIds.current.push(r2);
    });
    rafIds.current.push(r1);
  }, [loading, filtered.length]);

  useEffect(() => {
    const ids = rafIds.current;
    return () => ids.forEach(cancelAnimationFrame);
  }, []);

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

  // 导航交给卡片的 onOpen 回调：写入病人 id 到客户端 store 并跳转静态 /patient 页。
  const openDetail = useCallback(
    (p: Patient) => {
      // 记录当前滚动位置（详情页返回时由 router 滚动恢复），
      // 并把病人 id 写入客户端 store，导航到静态 /patient 页（离线可用）。
      sessionStorage.setItem("homeScroll", String(window.scrollY));
      sessionStorage.setItem("cc:pid", p.id);
      router.push("/patient");
    },
    [router]
  );

  const onMenu = useCallback((p: Patient) => setMenuPatient(p), []);

  const onReminderClick = useCallback(() => {
    router.push(
      reminders.overdueTodos > 0
        ? "/todos?filter=overdue"
        : "/todos?filter=today"
    );
  }, [router, reminders.overdueTodos]);

  const doDelete = useCallback(
    async (p: Patient) => {
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
    },
    [todos, toast]
  );

  // 列表虚拟化（窗口滚动）：大病房（>50 病人）下消除滚动卡顿。
  // 列表在文档中的纵向偏移用于虚拟化正确定位。
  const listRef = useRef<HTMLDivElement>(null);
  const [listOffset, setListOffset] = useState(0);
  useEffect(() => {
    const measure = () => {
      if (listRef.current) {
        const rect = listRef.current.getBoundingClientRect();
        setListOffset(rect.top + window.scrollY);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [filtered.length]);

  const virtualizer = useWindowVirtualizer({
    count: filtered.length,
    estimateSize: () => 68,
    overscan: 10,
    scrollMargin: listOffset,
  });

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
        <span className="relative z-10 text-[12px] text-muted">列表顺序</span>
        <div className="liquid-pill grid grid-cols-2 gap-1 p-1">
          {(["forward", "reverse"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setListDirection(d)}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition ${
                listDirection === d
                  ? "bg-primary liquid-pill-active text-white"
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
        <div
          ref={listRef}
          style={{ height: virtualizer.getTotalSize(), position: "relative" }}
        >
          {virtualizer.getVirtualItems().map((vi) => {
            const g = filtered[vi.index];
            const key = g.type === "group" ? g.id : g.patient.id;
            return (
              <div
                key={key}
                data-index={vi.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vi.start - listOffset}px)`,
                }}
                className="pb-2"
              >
                {g.type === "group" ? (
                  <GroupedPatientCard
                    items={g.items}
                    bedInfoMap={bedInfoMap}
                    onOpen={openDetail}
                    onMenu={onMenu}
                    animateEntry={false}
                  />
                ) : (
                  <PatientCard
                    patient={g.patient}
                    todoCount={g.todoCount}
                    status={g.status}
                    bedType={bedInfoMap.get(g.patient.id)?.bedType}
                    specialType={bedInfoMap.get(g.patient.id)?.specialType}
                    onOpen={openDetail}
                    onMenu={onMenu}
                    animateEntry={false}
                  />
                )}
              </div>
            );
          })}
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
