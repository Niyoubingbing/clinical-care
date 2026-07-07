import { RoundingBlock, RoundingConfig } from "@/types";
import { parseBed } from "./bed-parser";
import { uid } from "./db";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 床号末位基础床号数值，用于升序排序。 */
function trailingNumber(bed: string): number {
  const m = bed.match(/(\d+)\D*$/);
  return m ? parseInt(m[1], 10) : 0;
}

/** 块内床号升序规整。 */
export function normalizeBeds(beds: string[]): string[] {
  return [...beds].sort((a, b) => trailingNumber(a) - trailingNumber(b));
}

/** 床号是否带病区前缀的完整床号（如 309W01），区别于基础床号（如 01/J04）。 */
export function isFullBed(bed: string): boolean {
  return /^\d/.test(bed) && parseBed(bed).matched;
}

/** 病房块 / 真实加床块的展示标签。 */
export function blockLabel(block: RoundingBlock): string {
  if (block.kind === "extra") {
    return block.beds.length ? `加床 ${block.beds.join(" ")}` : "加床块";
  }
  const beds = block.beds;
  if (!beds.length) return "空病房块";
  const nums = beds
    .map((b) => trailingNumber(b))
    .filter((n) => !isNaN(n));
  const consecutive =
    nums.length === beds.length &&
    nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
  if (consecutive && beds.length > 1) {
    return `${beds[0]} – ${beds[beds.length - 1]}`;
  }
  return beds.join(" ");
}

/**
 * 基础规则：由「普通病床数 ÷ 平均病房床数」推导初始病房块。
 * 每块由连续基础床号填充，最后一间房床数可能少于平均值（PRD 4.9.3）。
 */
export function basicRuleFromCounts(
  regularBedCount: number,
  avgBedsPerRoom: number
): RoundingBlock[] {
  const total = Math.max(0, Math.floor(regularBedCount) || 0);
  const size = Math.max(1, Math.floor(avgBedsPerRoom) || 1);
  const blocks: RoundingBlock[] = [];
  let i = 1;
  while (i <= total) {
    const end = Math.min(i + size - 1, total);
    const beds: string[] = [];
    for (let n = i; n <= end; n++) beds.push(pad2(n));
    blocks.push({ id: uid(), kind: "room", beds });
    i = end + 1;
  }
  return blocks;
}

/** 序列化查房配置为可复制文本（JSON，便于导入还原，PRD 4.9.3）。 */
export function exportConfigText(config: RoundingConfig): string {
  return JSON.stringify(config, null, 2);
}

/** 解析可复制文本为查房配置；失败返回 null。导入时做基础校验（床号升序规整）。 */
export function importConfigText(text: string): RoundingConfig | null {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    return null;
  }
  if (
    !obj ||
    typeof obj !== "object" ||
    !Array.isArray((obj as RoundingConfig).blocks)
  ) {
    return null;
  }
  const c = obj as RoundingConfig;
  const ruleType: RoundingConfig["ruleType"] = ["default", "basic", "custom"].includes(
    c.ruleType
  )
    ? c.ruleType
    : "custom";
  const blocks: RoundingBlock[] = c.blocks.map((b) => ({
    id: b.id || uid(),
    kind: b.kind === "extra" ? "extra" : "room",
    ward: b.kind === "room" ? b.ward : undefined,
    beds: normalizeBeds(b.beds ?? []),
  }));
  return {
    ruleType,
    regularBedCount: c.regularBedCount,
    avgBedsPerRoom: c.avgBedsPerRoom,
    blocks,
  };
}
