import { Patient } from "@/types";
import { parseBed, DEFAULT_BED_TEMPLATE, DEFAULT_SPECIAL_MARKS } from "./bed-parser";

export interface RosterRow {
  bedNumber: string;
  name: string;
  diagnosis: string;
}

export interface RosterPreview {
  valid: RosterRow[];
  toAdd: RosterRow[];
  toUpdate: { existing: Patient; row: RosterRow }[];
  toRemove: Patient[];
  skipped: { line: number; raw: string; reason: string }[];
  removeAbsent: boolean;
}

function splitLine(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

export function analyzeRoster(
  text: string,
  existing: Patient[],
  removeAbsent: boolean
): RosterPreview {
  const lines = text.split(/\r?\n/);
  const valid: RosterRow[] = [];
  const skipped: { line: number; raw: string; reason: string }[] = [];

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) return;
    const cols = splitLine(line);
    if (cols.length < 3) {
      skipped.push({
        line: idx + 1,
        raw,
        reason: "缺少床号/姓名/诊断（至少 3 列）",
      });
      return;
    }
    const [bedNumber, name, ...rest] = cols;
    if (!bedNumber) {
      skipped.push({ line: idx + 1, raw, reason: "缺少床号" });
      return;
    }
    if (!name) {
      skipped.push({ line: idx + 1, raw, reason: "缺少姓名" });
      return;
    }
    valid.push({ bedNumber, name, diagnosis: rest.join(" ") });
  });

  const nameSet = new Set(valid.map((r) => r.name));
  const existingByName = new Map(existing.map((p) => [p.name, p]));

  const toAdd: RosterRow[] = [];
  const toUpdate: { existing: Patient; row: RosterRow }[] = [];

  for (const row of valid) {
    const ex = existingByName.get(row.name);
    if (ex) toUpdate.push({ existing: ex, row });
    else toAdd.push(row);
  }

  const toRemove = removeAbsent
    ? existing.filter((p) => !nameSet.has(p.name))
    : [];

  return { valid, toAdd, toUpdate, toRemove, skipped, removeAbsent };
}

export async function applyRoster(
  preview: RosterPreview,
  template: string = DEFAULT_BED_TEMPLATE,
  specialMarks: string[] = DEFAULT_SPECIAL_MARKS
): Promise<{ added: number; updated: number; removed: number }> {
  const { addPatient, updatePatient, deletePatient } = await import("./db");

  let added = 0;
  let updated = 0;
  let removed = 0;

  for (const row of preview.toAdd) {
    const parsed = parseBed(row.bedNumber, template, specialMarks);
    await addPatient({
      bedNumber: row.bedNumber,
      name: row.name,
      diagnosis: row.diagnosis,
      groupColor: "#e2e8f0",
      ward: parsed.ward,
      bedBase: parsed.bedBase,
      bedType: parsed.bedType,
      specialType: parsed.specialType,
    });
    added++;
  }

  for (const { existing, row } of preview.toUpdate) {
    const parsed = parseBed(row.bedNumber, template, specialMarks);
    await updatePatient(existing.id, {
      bedNumber: row.bedNumber,
      diagnosis: row.diagnosis,
      ward: parsed.ward,
      bedBase: parsed.bedBase,
      bedType: parsed.bedType,
      specialType: parsed.specialType,
    });
    updated++;
  }

  for (const p of preview.toRemove) {
    await deletePatient(p.id);
    removed++;
  }

  return { added, updated, removed };
}
