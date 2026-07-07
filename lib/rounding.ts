import { Patient, RoundingConfig, RoundingBlock } from "@/types";
import { parseBed } from "./bed-parser";
import { isFullBed, blockLabel } from "./rounding-edit";

export interface OrderedPatient {
  patient: Patient;
  groupId: string | null; // 所属病房块 id（含病区隔离后缀）；未进入序列为 null
  groupLabel: string | null;
}

/** 床号是否为带前缀完整床号（如 309W01），区别于基础床号（如 01）。 */
export function isFullBedNumber(bed: string): boolean {
  return isFullBed(bed);
}

/**
 * 将查房配置解析为有序病人序列（PRD 4.9.3 / 4.9.4）。
 * - direction=reverse 时，整条序列整体反转（块顺序 + 块内床号均反转）。
 * - 默认规则（块内为完整床号）：按 bedNumber 精确匹配。
 * - 基础规则（块内为基础床号）：按病区隔离套用块模板——各病区依次按 bedBase 匹配。
 * - 未进入任何块的病人在末尾按「病区 + 基础床号」升序追加。
 * 返回结果中相邻同 groupId 的病人即为同一病房块，供首页组合卡片展示。
 */
export function resolveOrder(
  config: RoundingConfig,
  patients: Patient[]
): OrderedPatient[] {
  const dir = config.direction ?? "forward";
  let blocks: RoundingBlock[] = config.blocks ?? [];
  if (dir === "reverse") {
    blocks = [...blocks]
      .reverse()
      .map((b) => ({ ...b, beds: [...b.beds].reverse() }));
  }

  const byBed = new Map(patients.map((p) => [p.bedNumber, p]));
  const placed = new Set<string>();
  const result: OrderedPatient[] = [];

  const blocksUseFull = blocks.some((b) => b.beds.some(isFullBed));

  const pushGroup = (block: RoundingBlock, ward?: string) => {
    const group: Patient[] = [];
    for (const bed of block.beds) {
      let p: Patient | undefined;
      if (blocksUseFull) {
        p = byBed.get(bed);
      } else {
        const n = parseInt(bed, 10);
        p = patients.find(
          (x) => (x.ward ?? "") === (ward ?? "") && x.bedBase === n
        );
      }
      if (p && !placed.has(p.id)) {
        group.push(p);
        placed.add(p.id);
      }
    }
    if (group.length) {
      const gid = ward ? `${block.id}#${ward}` : block.id;
      for (const p of group)
        result.push({ patient: p, groupId: gid, groupLabel: blockLabel(block) });
    }
  };

  if (blocksUseFull) {
    for (const block of blocks) pushGroup(block);
  } else {
    const wards = [
      ...new Set(patients.map((p) => p.ward).filter(Boolean)),
    ].sort((a, b) => a!.localeCompare(b!, "zh")) as string[];
    const wardList = wards.length ? wards : [""];
    for (const w of wardList) {
      for (const block of blocks) pushGroup(block, w);
    }
  }

  // 未进入序列的病人：末尾按病区 + 基础床号升序
  const unmatched = patients
    .filter((p) => !placed.has(p.id))
    .sort(
      (a, b) =>
        (a.ward ?? "").localeCompare(b.ward ?? "", "zh") ||
        (a.bedBase ?? 0) - (b.bedBase ?? 0)
    );
  for (const p of unmatched)
    result.push({ patient: p, groupId: null, groupLabel: null });

  return result;
}
