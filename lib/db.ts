import Dexie, { Table } from "dexie";
import {
  Patient,
  Todo,
  Settings,
  QuickTodo,
  RoundingUnit,
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

export function bedRoomLabel(beds: string[]): string {
  if (beds.length === 0) return "";
  const first = beds[0];
  const last = beds[beds.length - 1];
  const base = first.replace(/\d+$/, "");
  return `${first}-${last.replace(base, "")}`;
}

export function defaultRoundingOrder(): RoundingUnit[] {
  const room = (beds: string[]): RoundingUnit => ({
    id: uid(),
    kind: "room",
    ward: beds[0].replace(/\d+$/, ""),
    beds,
  });
  const extra = (bed: string, roomBeds: string[]): RoundingUnit => ({
    id: uid(),
    kind: "extra-real",
    bed,
    room: bedRoomLabel(roomBeds),
  });
  return [
    room(["309W41", "309W42", "309W43"]),
    extra("309WJ04", ["309W41", "309W42", "309W43"]),
    room(["309W38", "309W39", "309W40"]),
    extra("309WJ06", ["309W38", "309W39", "309W40"]),
    extra("309WJ07", ["309W38", "309W39", "309W40"]),
    room(["309W36", "309W37"]),
    room(["309W01", "309W02", "309W03"]),
    room(["309W04", "309W05", "309W06"]),
    extra("309WJ08", ["309W04", "309W05", "309W06"]),
    room(["309W34", "309W35"]),
    room(["309W07", "309W08", "309W09"]),
    extra("309WJ09", ["309W07", "309W08", "309W09"]),
    extra("309WJ10", ["309W07", "309W08", "309W09"]),
    extra("309WJ12", ["309W07", "309W08", "309W09"]),
    room(["309W10", "309W11", "309W12"]),
    extra("309WJ13", ["309W10", "309W11", "309W12"]),
    room(["309W13", "309W14", "309W15"]),
    extra("309WJ14", ["309W13", "309W14", "309W15"]),
    room(["309W16", "309W17", "309W18"]),
    extra("309WJ15", ["309W16", "309W17", "309W18"]),
    room(["309W19", "309W20", "309W21"]),
    extra("309WJ16", ["309W19", "309W20", "309W21"]),
    room(["309W22", "309W23", "309W24"]),
    extra("309WJ17", ["309W22", "309W23", "309W24"]),
    room(["309W25", "309W26", "309W27"]),
    extra("309WJ18", ["309W25", "309W26", "309W27"]),
    room(["309W28", "309W29", "309W30"]),
    room(["309W31", "309W32", "309W33"]),
  ];
}

export function defaultQuickTodos(): QuickTodo[] {
  return [
    { label: "换药", type: "换药", content: "换药" },
    { label: "查血", type: "查血", content: "查血" },
    { label: "术前准备", type: "开术前", content: "术前准备" },
  ];
}

export function defaultSettings(): Settings {
  return {
    id: 1,
    roundingOrder: defaultRoundingOrder(),
    quickTodos: defaultQuickTodos(),
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
  return s ?? defaultSettings();
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
      roundingOrder: s?.roundingOrder ?? defaultRoundingOrder(),
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
