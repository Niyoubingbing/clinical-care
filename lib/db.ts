import Dexie, { Table } from "dexie";
import {
  Patient,
  Todo,
  Settings,
  QuickTodo,
  RoundingBlock,
  RoundingConfig,
} from "@/types";

export class ClinicalDB extends Dexie {
  patients!: Table<Patient, string>;
  todos!: Table<Todo, string>;
  settings!: Table<Settings, number>;

  constructor() {
    super("ClinicalDB");
    this.version(1).stores({
      patients: "id, bedNumber, name",
      todos: "id, patientId, status, dueDate",
      settings: "id",
    });
  }
}

export const db = new ClinicalDB();

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ---- Default seed data ----

/**
 * 内置「默认规则」：以 309W01 系列为代表的带病区前缀示范布局（PRD 4.9.2 / 4.9.3）。
 * 以基础规则同款「病房块 + 真实加床块」结构存储，病房块 beds 为带前缀完整床号。
 */
export function defaultRoundingConfig(): RoundingConfig {
  const room = (beds: string[]): RoundingBlock => ({
    id: uid(),
    kind: "room",
    ward: beds[0].replace(/\d+$/, ""),
    beds,
  });
  const extra = (bed: string): RoundingBlock => ({
    id: uid(),
    kind: "extra",
    beds: [bed],
  });
  return {
    ruleType: "default",
    blocks: [
      room(["309W41", "309W42", "309W43"]),
      extra("309WJ04"),
      room(["309W38", "309W39", "309W40"]),
      extra("309WJ06"),
      extra("309WJ07"),
      room(["309W36", "309W37"]),
      room(["309W01", "309W02", "309W03"]),
      room(["309W04", "309W05", "309W06"]),
      extra("309WJ08"),
      room(["309W34", "309W35"]),
      room(["309W07", "309W08", "309W09"]),
      extra("309WJ09"),
      extra("309WJ10"),
      extra("309WJ12"),
      room(["309W10", "309W11", "309W12"]),
      extra("309WJ13"),
      room(["309W13", "309W14", "309W15"]),
      extra("309WJ14"),
      room(["309W16", "309W17", "309W18"]),
      extra("309WJ15"),
      room(["309W19", "309W20", "309W21"]),
      extra("309WJ16"),
      room(["309W22", "309W23", "309W24"]),
      extra("309WJ17"),
      room(["309W25", "309W26", "309W27"]),
      extra("309WJ18"),
      room(["309W28", "309W29", "309W30"]),
      room(["309W31", "309W32", "309W33"]),
    ],
  };
}

/** 旧数据（Unit[] 或 string[]）迁移为新的 RoundingConfig（PRD 4.9.4 兼容迁移）。 */
export function migrateRoundingOrder(raw: unknown): RoundingConfig {
  const isNewConfig =
    raw &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    "blocks" in (raw as Record<string, unknown>);
  if (isNewConfig) {
    const c = raw as RoundingConfig;
    return {
      ruleType: c.ruleType ?? "custom",
      regularBedCount: c.regularBedCount,
      avgBedsPerRoom: c.avgBedsPerRoom,
      blocks: c.blocks ?? [],
    };
  }
  if (Array.isArray(raw)) {
    if (raw.length && typeof raw[0] === "string") {
      return {
        ruleType: "custom",
        blocks: [{ id: uid(), kind: "room", beds: raw as string[] }],
      };
    }
    const blocks: RoundingBlock[] = (raw as Record<string, unknown>[]).map(
      (u) => {
        if (u && u.kind === "room")
          return {
            id: (u.id as string) || uid(),
            kind: "room",
            ward: u.ward as string | undefined,
            beds: Array.isArray(u.beds) ? (u.beds as string[]) : [],
          };
        if (u && u.kind === "extra-real")
          return {
            id: (u.id as string) || uid(),
            kind: "extra",
            beds: u.bed ? [u.bed as string] : [],
          };
        return { id: uid(), kind: "room", beds: [] };
      }
    );
    return { ruleType: "custom", blocks };
  }
  return defaultRoundingConfig();
}

export function defaultQuickTodos(): QuickTodo[] {
  return [
    { id: "qt-dressing", label: "换药", type: "换药", content: "换药" },
    { id: "qt-blood", label: "查血", type: "查血", content: "查血" },
    { id: "qt-preop", label: "术前准备", type: "开术前", content: "术前准备" },
  ];
}

export function defaultCustomGroups(): { id: string; name: string; color: string }[] {
  return [
    { id: "g-jie", name: "解组", color: "#fecaca" },
    { id: "g-yong", name: "勇组", color: "#bfdbfe" },
    { id: "g-li", name: "李组", color: "#bbf7d0" },
    { id: "g-wang", name: "王组", color: "#fde68a" },
  ];
}

export function defaultSettings(): Settings {
  return {
    id: 1,
    roundingOrder: defaultRoundingConfig(),
    listDirection: "forward",
    quickTodos: defaultQuickTodos(),
    customGroups: defaultCustomGroups(),
    theme: "system",
    bedTemplate: "^(\\d{3})([A-Z])([A-Z]{0,2})?(\\d{2})$",
    specialMarks: ["J", "YZ"],
  };
}

db.on("populate", () => {
  return db.settings.add(defaultSettings());
});

// ---- Settings ----

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get(1);
  if (!s) return defaultSettings();
  // 纯读：仅返回旧格式迁移后的视图，不在 querier 内写回，
  // 消除「读里写」订阅回环（迁移写回由 ensureSettingsMigrated 一次性完成）。
  const migrated = migrateRoundingOrder(s.roundingOrder);
  return { ...s, roundingOrder: migrated };
}

// 一次性迁移：将旧格式 roundingOrder 与缺失 id 的 quickTodos 写回数据库。
// 由模块级 flag 保证全应用仅执行一次（在 Providers 挂载时调用），
// 避免每次 getSettings 读取都触发写回与订阅回环。
let migrationDone = false;
export async function ensureSettingsMigrated(): Promise<void> {
  if (migrationDone) return;
  migrationDone = true;
  const s = await db.settings.get(1);
  if (!s) return;
  const raw = s.roundingOrder as unknown;
  const isNewConfig =
    raw &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    "blocks" in (raw as Record<string, unknown>);
  const quickTodos = (s.quickTodos ?? []).map((q, i) =>
    q.id ? q : { ...q, id: `qt-${i}-${q.label}` }
  );
  const needsQuickMigration = (s.quickTodos ?? []).some((q) => !q.id);
  if (!isNewConfig || needsQuickMigration) {
    const migrated = migrateRoundingOrder(s.roundingOrder);
    await db.settings.put({ ...s, roundingOrder: migrated, quickTodos, id: 1 });
  }
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch, id: 1 });
}

// ---- Patients ----

export async function addPatient(
  data: Omit<Patient, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = Date.now();
  const id = uid();
  await db.patients.add({ ...data, id, createdAt: now, updatedAt: now });
  return id;
}

export async function updatePatient(
  id: string,
  patch: Partial<Patient>
): Promise<void> {
  await db.patients.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deletePatient(id: string): Promise<void> {
  await db.transaction("rw", db.patients, db.todos, async () => {
    await db.todos.where("patientId").equals(id).delete();
    await db.patients.delete(id);
  });
}

// ---- Todos ----

export async function addTodo(
  data: Omit<Todo, "id" | "createdAt" | "status"> & {
    status?: "pending" | "completed";
  }
): Promise<string> {
  const now = Date.now();
  const id = uid();
  await db.todos.add({
    ...data,
    id,
    status: data.status ?? "pending",
    createdAt: now,
  });
  return id;
}

export async function updateTodo(
  id: string,
  patch: Partial<Todo>
): Promise<void> {
  await db.todos.update(id, patch);
}

export async function toggleTodo(
  id: string,
  completed: boolean
): Promise<void> {
  const todo = await db.todos.get(id);
  if (!todo) return;
  if (completed) {
    await db.todos.update(id, {
      status: "completed",
      completedAt: Date.now(),
    });
    // PRD 4.7: completing a 换药 todo updates lastDressingChange to today
    if (todo.type === "换药" && todo.patientId) {
      await db.patients.update(todo.patientId, {
        lastDressingChange: todayStr(),
        updatedAt: Date.now(),
      });
    }
  } else {
    await db.todos.update(id, {
      status: "pending",
      completedAt: undefined,
    });
  }
}

export async function deleteTodo(id: string): Promise<void> {
  await db.todos.delete(id);
}

// ---- Data management ----

export async function clearAllData(): Promise<void> {
  await db.transaction("rw", db.patients, db.todos, db.settings, async () => {
    await db.patients.clear();
    await db.todos.clear();
    const s = await db.settings.get(1);
    await db.settings.put({
      id: 1,
      roundingOrder: s?.roundingOrder ?? defaultRoundingConfig(),
      quickTodos: s?.quickTodos ?? defaultQuickTodos(),
      theme: s?.theme ?? "system",
      bedTemplate: s?.bedTemplate,
      specialMarks: s?.specialMarks,
    });
  });
}

// ---- Utilities ----

export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 默认分组颜色（病人未指定所属分组时的兜底色），统一单一来源。
export const DEFAULT_GROUP_COLOR = "#e2e8f0";
