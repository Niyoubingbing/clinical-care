import { Patient, Todo, DressingSchedule } from "@/types";
import { dueLabel } from "./time-parser";
import { dressingInfo } from "./dressing";

const WEEK_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function weekdayCn(d: Date = new Date()): string {
  return WEEK_NAMES[d.getDay()];
}

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 是否需要在今日提醒换药：基于「手术日计划」——今天是换药日且今日尚未完成换药。
 * 不依赖 auto-create 是否已运行（未完成待办即视为需换药）。
 */
export function needsDressing(
  p: Patient,
  schedule: DressingSchedule,
  todos: Todo[],
  today: string = todayStr()
): boolean {
  const info = dressingInfo(p, schedule, todos, today);
  return info.isDressingDay && !info.doneToday;
}

export function needsBlood(
  p: Patient,
  today: string = todayStr()
): boolean {
  if (!p.bloodTestDay) return false;
  const todayName = weekdayCn(new Date(today + "T00:00:00"));
  const days = p.bloodTestDay.split(/[\s、，,]+/).filter(Boolean);
  return days.includes(todayName);
}

export interface ReminderSummary {
  overdueTodos: number;
  todayTodos: number;
  needDressing: number;
  needBlood: number;
  hasAny: boolean;
  level: "none" | "warning" | "danger";
}

export function computeReminders(
  patients: Patient[],
  todos: Todo[],
  today: string = todayStr(),
  schedule?: DressingSchedule
): ReminderSummary {
  let overdueTodos = 0;
  let todayTodos = 0;
  let needDressing = 0;
  let needBlood = 0;

  for (const t of todos) {
    if (t.status !== "pending" || !t.dueDate) continue;
    const info = dueLabel(t.dueDate);
    if (info.level === "overdue") overdueTodos++;
    else if (info.level === "today") todayTodos++;
  }

  for (const p of patients) {
    if (schedule && needsDressing(p, schedule, todos, today)) needDressing++;
    if (needsBlood(p, today)) needBlood++;
  }

  const hasAny =
    overdueTodos > 0 ||
    todayTodos > 0 ||
    needDressing > 0 ||
    needBlood > 0;
  const level: ReminderSummary["level"] =
    overdueTodos > 0 || needDressing > 0
      ? "danger"
      : todayTodos > 0 || needBlood > 0
        ? "warning"
        : "none";

  return {
    overdueTodos,
    todayTodos,
    needDressing,
    needBlood,
    hasAny,
    level,
  };
}

/** Per-patient status badges for the cards. */
export interface PatientStatus {
  needDressing: boolean;
  needBlood: boolean;
  todayDue: boolean;
  overdue: boolean;
  postOpDay: number | null;
  dressingToday: boolean;
  nextDressingInDays: number | null;
}

export function patientStatus(
  p: Patient,
  todos: Todo[],
  today: string = todayStr(),
  schedule?: DressingSchedule
): PatientStatus {
  const pt = todos.filter((t) => t.patientId === p.id);
  let todayDue = false;
  let overdue = false;
  for (const t of pt) {
    if (t.status !== "pending" || !t.dueDate) continue;
    const info = dueLabel(t.dueDate);
    if (info.level === "overdue") overdue = true;
    else if (info.level === "today") todayDue = true;
  }
  const info = schedule
    ? dressingInfo(p, schedule, todos, today)
    : {
        hasSchedule: false,
        postOpDay: null,
        isDressingDay: false,
        doneToday: false,
        nextInDays: null,
      };
  return {
    needDressing: schedule ? info.isDressingDay && !info.doneToday : false,
    needBlood: needsBlood(p, today),
    todayDue,
    overdue,
    postOpDay: info.postOpDay,
    dressingToday: info.isDressingDay,
    nextDressingInDays: info.nextInDays,
  };
}

export function pendingTodoCount(p: Patient, todos: Todo[]): number {
  return todos.filter(
    (t) => t.patientId === p.id && t.status === "pending"
  ).length;
}
