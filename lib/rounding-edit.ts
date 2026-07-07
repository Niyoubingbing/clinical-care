import { Patient, RoundingUnit } from "@/types";
import { parseBed } from "./bed-parser";
import { bedRoomLabel, uid } from "./db";

const PAD = 2;

function pad2(n: number): string {
  return String(n).padStart(PAD, "0");
}

/** 床号末位基础床号数值，如 "309W41" -> 41 */
function baseOf(bed: string): number | null {
  const m = bed.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * 病区基底 + 起始/结束 -> 完整床号数组。
 * expandRange("309W", 1, 3) => ["309W01","309W02","309W03"]
 * 支持起 > 止（自动取 min/max）。
 */
export function expandRange(ward: string, start: number, end: number): string[] {
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const out: string[] = [];
  for (let n = lo; n <= hi; n++) out.push(ward + pad2(n));
  return out;
}

/**
 * 从已展开的 beds 反推 { ward, start, end }，用于把已存单元回填到「起-止」表单。
 * 跨病区或无法解析时返回 null（此时表单回退为只读预览）。
 */
export function inferRoomRange(
  beds: string[]
): { ward: string; start: number; end: number } | null {
  if (!beds.length) return null;
  let ward = "";
  let min = Infinity;
  let max = -Infinity;
  for (const b of beds) {
    const m = b.match(/^(\D+)(\d+)$/);
    if (!m) return null;
    if (!ward) ward = m[1];
    else if (ward !== m[1]) return null; // 跨病区，无法用单一段表达
    const n = parseInt(m[2], 10);
    if (n < min) min = n;
    if (n > max) max = n;
  }
  if (!isFinite(min)) return null;
  return { ward, start: min, end: max };
}

/** 已识别病区列表（去重，按出现顺序）。 */
export function listWards(patients: Patient[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of patients) {
    const w = p.ward || parseBed(p.bedNumber ?? "").ward;
    if (w && !seen.has(w)) {
      seen.add(w);
      out.push(w);
    }
  }
  return out;
}

/** 已识别为真实加床（extra-real）的床号清单（去重、排序）。 */
export function listExtraRealBeds(patients: Patient[]): string[] {
  const set = new Set<string>();
  for (const p of patients) {
    if (p.bedType === "extra-real" && p.bedNumber) set.add(p.bedNumber);
  }
  return [...set].sort();
}

/** 各病房块标签（如 309W41-43），作为真实加床「归属病房」的下拉选项。 */
export function roomLabels(units: RoundingUnit[]): string[] {
  return units
    .filter((u) => u.kind === "room")
    .map((u) => bedRoomLabel(u.beds))
    .filter(Boolean);
}

/**
 * 按「病区 -> 基础床号」把床号数组聚合成查房单元：
 * 相邻的普通真实床成一段 room；真实加床单独成 extra-real 单元。
 */
function unitsFromBeds(beds: string[]): RoundingUnit[] {
  const parsed = beds
    .map((b) => ({ b, r: parseBed(b) }))
    .sort((a, b) => a.r.bedBase - b.r.bedBase);
  const units: RoundingUnit[] = [];
  let cur: string[] = [];
  let curWard = "";
  const flush = () => {
    if (cur.length) {
      units.push({ id: uid(), kind: "room", ward: curWard, beds: [...cur] });
      cur = [];
    }
  };
  for (const { b, r } of parsed) {
    if (r.bedType === "extra-real") {
      flush();
      units.push({ id: uid(), kind: "extra-real", bed: b, room: curWard });
    } else {
      const last = cur.length ? baseOf(cur[cur.length - 1]) : null;
      if (last !== null && r.bedBase !== last + 1) flush();
      curWard = r.ward;
      cur.push(b);
    }
  }
  flush();
  return units;
}

/** 高级文本输入：每行一个床号，解析为查房单元。 */
export function unitsFromText(text: string): RoundingUnit[] {
  const beds = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  return unitsFromBeds(beds);
}

/** 将一组（同病区）病人按基础床号聚合成查房单元：相邻真实床成段为 room，真实加床独立成 extra-real。 */
function unitsForList(list: Patient[]): RoundingUnit[] {
  list.sort((a, b) => (a.bedBase ?? 0) - (b.bedBase ?? 0));
  const units: RoundingUnit[] = [];
  let cur: string[] = [];
  let curWard = "";
  const flush = () => {
    if (cur.length) {
      units.push({ id: uid(), kind: "room", ward: curWard, beds: [...cur] });
      cur = [];
    }
  };
  for (const p of list) {
    if (p.bedType === "extra-real") {
      flush();
      units.push({
        id: uid(),
        kind: "extra-real",
        bed: p.bedNumber,
        room: curWard || p.ward || "",
      });
    } else {
      const last = cur.length ? baseOf(cur[cur.length - 1]) : null;
      if (last !== null && (p.bedBase ?? 0) !== last + 1) flush();
      curWard = p.ward || "";
      if (p.bedNumber) cur.push(p.bedNumber);
    }
  }
  flush();
  return units;
}

/** 仅针对单个病区，按基础床号自动聚合生成查房片段（不含其他病区）。 */
export function buildWardDraft(patients: Patient[], ward: string): RoundingUnit[] {
  const list = patients.filter(
    (p) => (p.ward || parseBed(p.bedNumber ?? "").ward) === ward
  );
  return unitsForList(list);
}

/**
 * 按当前病人库生成查房序列草稿：
 * 读全部病人，按病区分组、组内按基础床号排序，相邻真实床成段，真实加床插入其所在病区序列中。
 * 不自动包含未导入的床；需用户手动触发（呼应 PRD「不自动加入 roundingOrder」原则）。
 */
export function buildDraftFromPatients(patients: Patient[]): RoundingUnit[] {
  const byWard = new Map<string, Patient[]>();
  for (const p of patients) {
    const w = p.ward || parseBed(p.bedNumber ?? "").ward;
    if (!w) continue;
    if (!byWard.has(w)) byWard.set(w, []);
    byWard.get(w)!.push(p);
  }
  const sortedWards = [...byWard.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "zh")
  );
  const units: RoundingUnit[] = [];
  for (const [, list] of sortedWards) {
    units.push(...unitsForList(list));
  }
  return units;
}

/** 取单元所属病区：病房块取 ward；真实加床按床号解析其病区。 */
export function wardOfUnit(u: RoundingUnit): string {
  if (u.kind === "room") return u.ward;
  return parseBed(u.bed).ward;
}
