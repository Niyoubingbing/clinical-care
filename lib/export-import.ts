import { Patient, Todo } from "@/types";
import { db, clearAllData } from "./db";

export function downloadJSON(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportClinicalData(
  patients: Patient[],
  todos: Todo[]
): void {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const filename = `clinical-care-${y}-${m}-${day}.json`;
  const data = {
    patients: patients.map(({ ...p }) => ({ ...p })),
    todos: todos.map(({ ...t }) => ({ ...t })),
    exportedAt: Date.now(),
  };
  downloadJSON(filename, data);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export interface ParsedClinical {
  patients: Patient[];
  todos: Todo[];
}

export function parseClinicalJSON(text: string): ParsedClinical {
  const obj = JSON.parse(text);
  if (!obj || typeof obj !== "object") {
    throw new Error("文件格式不正确");
  }
  const patients = Array.isArray(obj.patients) ? obj.patients : [];
  const todos = Array.isArray(obj.todos) ? obj.todos : [];
  if (patients.length === 0 && todos.length === 0) {
    throw new Error("文件中没有病人或待办数据");
  }
  return { patients, todos };
}

export async function importClinicalData(
  data: ParsedClinical
): Promise<void> {
  await db.transaction("rw", db.patients, db.todos, async () => {
    await db.patients.clear();
    await db.todos.clear();
    if (data.patients.length) await db.patients.bulkAdd(data.patients);
    if (data.todos.length) await db.todos.bulkAdd(data.todos);
  });
}

export async function resetAllData(): Promise<void> {
  await clearAllData();
}

export interface ImportPreview {
  incomingPatients: number;
  incomingTodos: number;
  existingPatients: number;
  existingTodos: number;
}

export async function previewImport(
  data: ParsedClinical
): Promise<ImportPreview> {
  const [existingPatients, existingTodos] = await Promise.all([
    db.patients.count(),
    db.todos.count(),
  ]);
  return {
    incomingPatients: data.patients.length,
    incomingTodos: data.todos.length,
    existingPatients,
    existingTodos,
  };
}
