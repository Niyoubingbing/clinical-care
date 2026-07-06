import { Patient, Todo } from "@/types";
import { formatDate } from "./db";

export interface DailySummary {
  date: string;
  dressing: number;
  bloodTest: number;
  patients: { bedNumber: string; name: string; todos: string[] }[];
  general: string[];
  hasItems: boolean;
  text: string;
}

export function buildDailySummary(
  todos: Todo[],
  patients: Patient[],
  today: string
): DailySummary {
  const done = todos.filter(
    (t) =>
      t.status === "completed" &&
      t.completedAt != null &&
      formatDate(new Date(t.completedAt)) === today
  );

  const patientMap = new Map(patients.map((p) => [p.id, p]));

  let dressing = 0;
  let bloodTest = 0;
  for (const t of done) {
    if (t.type === "换药") dressing++;
    else if (t.type === "查血") bloodTest++;
  }

  const byPatient = new Map<string, string[]>();
  const general: string[] = [];
  for (const t of done) {
    if (t.patientId && patientMap.has(t.patientId)) {
      const arr = byPatient.get(t.patientId) ?? [];
      arr.push(t.content);
      byPatient.set(t.patientId, arr);
    } else {
      general.push(t.content);
    }
  }

  const patientList = [...byPatient.entries()].map(([pid, contents]) => {
    const p = patientMap.get(pid)!;
    return { bedNumber: p.bedNumber, name: p.name, todos: contents };
  });

  // Build text
  const lines: string[] = [];
  lines.push(`${today} 工作小结`);
  lines.push(`换药：${dressing} 项`);
  lines.push(`查血：${bloodTest} 项`);
  lines.push("");
  for (const p of patientList) {
    const items = p.todos.map((c) => `给该病人${c}`).join("，");
    lines.push(`${p.bedNumber} ${p.name}：${items}`);
  }
  if (general.length > 0) {
    lines.push(`通用：${general.join("，")}`);
  }
  const text = lines.join("\n");

  return {
    date: today,
    dressing,
    bloodTest,
    patients: patientList,
    general,
    hasItems: done.length > 0,
    text,
  };
}
