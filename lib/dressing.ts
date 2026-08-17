import { Patient, Todo, Settings, DressingSchedule } from "@/types";
import { addTodo, todayStr } from "@/lib/db";

/**
 * 解析 YYYY-MM-DD 为本地 0 点 Date；非法返回 null。
 */
function parseDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

/**
 * 在 YYYY-MM-DD 基础上加 n 天，返回 YYYY-MM-DD。
 */
function addDaysStr(s: string, n: number): string {
  const d = parseDate(s);
  if (!d) return s;
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 两个 YYYY-MM-DD 之间相差的天数（b - a），按 0 点对齐并四舍五入消除 DST 误差。
 */
function dayDiff(a: string, b: string): number {
  const da = parseDate(a);
  const db = parseDate(b);
  if (!da || !db) return 0;
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export interface DressingInfo {
  hasSchedule: boolean;
  postOpDay: number | null;
  isDressingDay: boolean;
  doneToday: boolean;
  nextInDays: number | null;
}

/**
 * 解析每病人的换药计划：优先用 Patient.dressingSchedule，否则回退 Settings.dressingSchedule。
 */
export function resolveSchedule(p: Patient, settings: Settings): DressingSchedule {
  return p.dressingSchedule ?? settings.dressingSchedule;
}

/**
 * 根据换药计划生成术后换药日列表（术后天数）。
 * 首日 = s.earlyInterval，之后每个 = 前一个 + s.laterInterval，直到 > s.maxDay 停止。
 * 例如 {earlyInterval:2, laterInterval:3, maxDay:14} => [2,5,8,11,14]。
 */
export function dressingDays(s: DressingSchedule): number[] {
  const out: number[] = [];
  if (s.earlyInterval < 0 || s.laterInterval <= 0) return out;
  let cur = s.earlyInterval;
  while (cur <= s.maxDay) {
    out.push(cur);
    cur = cur + s.laterInterval;
  }
  return out;
}

/**
 * 术后天数：手术日=0；未设手术日=null；术前为负。
 */
export function postOpDay(surgeryDate?: string, today: string = todayStr()): number | null {
  if (!surgeryDate) return null;
  const sd = parseDate(surgeryDate);
  const td = parseDate(today);
  if (!sd || !td) return null;
  return Math.round((td.getTime() - sd.getTime()) / 86400000);
}

/**
 * 下一个换药日的 YYYY-MM-DD；若已超过 maxDay（无未来换药日）则返回 null。
 */
export function nextDressingDate(
  p: Patient,
  schedule: DressingSchedule,
  today: string
): string | null {
  if (!p.surgeryDate) return null;
  for (const d of dressingDays(schedule)) {
    const date = addDaysStr(p.surgeryDate, d);
    if (date >= today) return date;
  }
  return null;
}

/**
 * 汇总某病人的换药状态，供卡片徽标、详情页、提醒计数使用。
 */
export function dressingInfo(
  p: Patient,
  schedule: DressingSchedule,
  todos: Todo[],
  today: string
): DressingInfo {
  const pod = postOpDay(p.surgeryDate, today);
  const daySet = new Set(dressingDays(schedule));
  const isDressingDay =
    pod !== null &&
    daySet.has(pod) &&
    pod >= 0 &&
    pod <= schedule.maxDay &&
    pod >= schedule.earlyInterval;
  const doneToday = todos.some(
    (t) =>
      t.patientId === p.id &&
      t.status === "completed" &&
      t.type === "换药" &&
      t.dueDate === today
  );
  const next = nextDressingDate(p, schedule, today);
  const nextInDays = next === null ? null : dayDiff(today, next);
  return {
    hasSchedule: true,
    postOpDay: pod,
    isDressingDay,
    doneToday,
    nextInDays,
  };
}

/**
 * 今日换药待办的稳定 key（用于幂等判断与快速查找）。
 */
export function dressingTodoKey(patientId: string, dueDate: string): string {
  return `${patientId}|换药|${dueDate}`;
}

/**
 * 为每个有手术日且今天是换药日的病人，确保存在一条今日「换药」待办（幂等）。
 * 仅创建 today 的待办，不补历史日；已存在（任何状态）则不重复创建。
 */
export async function ensureTodaysDressingTodos(
  patients: Patient[],
  settings: Settings,
  todos: Todo[],
  today: string
): Promise<void> {
  for (const p of patients) {
    if (!p.surgeryDate) continue;
    const schedule = resolveSchedule(p, settings);
    const info = dressingInfo(p, schedule, todos, today);
    if (!info.isDressingDay) continue;
    const key = dressingTodoKey(p.id, today);
    const exists = todos.some(
      (t) => dressingTodoKey(t.patientId ?? "", t.dueDate ?? "") === key
    );
    if (exists) continue;
    await addTodo({
      patientId: p.id,
      content: "换药",
      type: "换药",
      dueDate: today,
      status: "pending",
    });
  }
}
