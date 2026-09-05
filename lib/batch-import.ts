import { Patient, RoundingConfig } from "@/types";
import { parseBed, DEFAULT_BED_TEMPLATE, DEFAULT_SPECIAL_MARKS } from "./bed-parser";
import { recognizeBed } from "./bed-identity";
import { normalizeBedNumber, bedKey } from "./bed-number";
import {
  DEFAULT_GROUP_COLOR,
  addPatient,
  updatePatient,
  deletePatient,
  getSettings,
  db,
} from "./db";

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
  const parsedRows: RosterRow[] = [];
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
    parsedRows.push({ bedNumber, name, diagnosis: rest.join(" ") });
  });

  // A pasted roster can contain the same patient more than once. Keep the
  // last occurrence (the freshest row) so one import never creates duplicate
  // patients or performs multiple conflicting updates for the same name.
  const latestByName = new Map<string, RosterRow>();
  for (const row of parsedRows) latestByName.set(row.name, row);
  const valid = Array.from(latestByName.values()).map(row => ({ ...row, bedNumber: normalizeBedNumber(row.bedNumber) }));

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
    && valid.length > 0 && skipped.length === 0 ? existing.filter((p) => !nameSet.has(p.name))
    : [];

  return { valid, toAdd, toUpdate, toRemove, skipped, removeAbsent };
}

/**
 * 落库批量导入结果。
 *
 * - ward / bedBase / specialType 仍由 parseBed（展示解析）得到；
 * - bedType 统一由 recognizeBed 依据独立识别规则和单床修正判定（v2.18 起）。
 *   未显式传入 roundingOrder / virtualOverrides 时，自动从 settings 读取，
 *   保证任何调用点写入的 bedType 与首页筛选口径一致。
 */
export async function applyRoster(
  preview: RosterPreview,
  template: string = DEFAULT_BED_TEMPLATE,
  specialMarks: string[] = DEFAULT_SPECIAL_MARKS,
  roundingOrder?: RoundingConfig,
  virtualOverrides?: string[]
): Promise<{ added: number; updated: number; removed: number }> {
  if (!preview.valid.length) throw new Error("没有可导入的有效病人，现有数据未改动");
  if (preview.removeAbsent && preview.skipped.length) throw new Error("存在未识别行，请先修正或关闭「移除未出现的病人」");
  if (new Set(preview.valid.map(row => bedKey(row.bedNumber))).size !== preview.valid.length) throw new Error("名单中有重复床号，请确认后再导入");
  let added = 0;
  let updated = 0;
  let removed = 0;

  // 事务外先取设置：Dexie 事务内再发起无关读取容易踩到事务作用域限制。
  let order = roundingOrder;
  let overrides = virtualOverrides;
  if (order === undefined || overrides === undefined) {
    const s = await getSettings();
    if (order === undefined) order = s.roundingOrder;
    if (overrides === undefined) overrides = s.virtualOverrides;
  }
  const settings = await getSettings();
  const defaultGroup = settings.customGroups?.[0];

  await db.transaction("rw", db.patients, db.todos, async () => {
    const current = await db.patients.toArray();
    const names = new Set<string>();
    for (const p of current) {
      if (names.has(p.name) && preview.valid.some(row => row.name === p.name)) throw new Error("存在同名病人，请先分别编辑，避免更新错人");
      names.add(p.name);
    }
    for (const { existing } of preview.toUpdate) {
      const fresh = current.find(p => p.id === existing.id);
      if (!fresh || fresh.updatedAt !== existing.updatedAt) throw new Error("病人信息已更改，请重新预览");
    }
    for (const p of preview.toRemove) {
      const fresh = current.find(item => item.id === p.id);
      if (fresh && fresh.updatedAt !== p.updatedAt) throw new Error("病人信息已更改，请重新预览");
    }
    if (preview.toAdd.some(row => names.has(row.name))) throw new Error("名单已更改或已导入，请重新预览");
    for (const row of preview.toAdd) {
      const parsed = parseBed(row.bedNumber, template, specialMarks);
      await addPatient({
        bedNumber: row.bedNumber,
        name: row.name,
        diagnosis: row.diagnosis,
        group: defaultGroup?.name,
        groupColor: defaultGroup?.color ?? DEFAULT_GROUP_COLOR,
        ward: parsed.ward,
        bedBase: parsed.bedBase,
        bedType: recognizeBed({ bedNumber: row.bedNumber, ward: parsed.ward, bedBase: parsed.bedBase }, { ...settings, bedTemplate: template, specialMarks, roundingOrder: order, virtualOverrides: overrides }),
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
        bedType: recognizeBed({ bedNumber: row.bedNumber, ward: parsed.ward, bedBase: parsed.bedBase }, { ...settings, bedTemplate: template, specialMarks, roundingOrder: order, virtualOverrides: overrides }),
        specialType: parsed.specialType,
      });
      updated++;
    }

    for (const p of preview.toRemove) {
      await deletePatient(p.id);
      removed++;
    }
  });

  return { added, updated, removed };
}
