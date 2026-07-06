import { Patient, Todo } from "@/types";
import { dueLabel } from "./time-parser";

const WEEK_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function addDaysStr(s: string, n: number): string {
  const d = parseDate(s);
  if (!d) return s;
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function weekdayCn(d: Date = new Date()): string {
  return WEEK_NAMES[d.getDay()];
}

export function needsDressing(
  p: Patient,
  today: string = todayStr()
): boolean {
  if (!p.dressingFrequency || !p.lastDressingChange) return false;
  const next = addDaysStr(p.lastDressingChange, p.dressingFrequency);
  return next <= today;
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

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  today: string = todayStr()
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
    if (needsDressing(p, today)) needDressing++;
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
}

export function patientStatus(
  p: Patient,
  todos: Todo[],
  today: string = todayStr()
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
  return {
    needDressing: needsDressing(p, today),
    needBlood: needsBlood(p, today),
    todayDue,
    overdue,
  };
}

export function pendingTodoCount(p: Patient, todos: Todo[]): number {
  return todos.filter(
    (t) => t.patientId === p.id && t.status === "pending"
  ).length;
}
