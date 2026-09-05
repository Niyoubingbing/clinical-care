import { RoundingBlock, RoundingConfig } from "@/types";
import { bedKey, normalizeBedNumber } from "./bed-number";
import { isRelativeBed } from "./rounding-match";
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
  return !!bed && !isRelativeBed(bed);
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
  const total = Number.isFinite(regularBedCount) ? Math.min(2000, Math.max(0, Math.floor(regularBedCount))) : 0;
  const size = Number.isFinite(avgBedsPerRoom) ? Math.max(1, Math.floor(avgBedsPerRoom)) : 1;
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

/** Validate imported configuration without changing the user's block/bed order. */
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
  const c = obj as Partial<RoundingConfig>;
  const ruleType: RoundingConfig["ruleType"] =
    c.ruleType === "default" || c.ruleType === "basic" || c.ruleType === "custom"
      ? c.ruleType
      : "custom";
  const blocks: RoundingBlock[] = [];
  const ids = new Set<string>();
  for (const rawBlock of c.blocks ?? []) {
    if (!rawBlock || typeof rawBlock !== "object") return null;
    const block = rawBlock as Partial<RoundingBlock>;
    if (!Array.isArray(block.beds) || !block.beds.every((bed) => typeof bed === "string")) {
      return null;
    }
    const id = typeof block.id === "string" && block.id ? block.id : uid();
    if (ids.has(id) || block.beds.some(b => !b.trim())) return null;
    ids.add(id);
    const beds = block.beds.map(normalizeBedNumber);
    if (new Set(beds.map(bedKey)).size !== beds.length) return null;
    if (block.kind === "extra") {
      blocks.push({ id, kind: "extra", beds });
    } else if (block.kind === "room") {
      blocks.push({
        id,
        kind: "room",
        ward: typeof block.ward === "string" ? block.ward : undefined,
        beds,
      });
    } else {
      return null;
    }
  }
  return {
    ruleType,
    regularBedCount: c.regularBedCount,
    avgBedsPerRoom: c.avgBedsPerRoom,
    blocks,
  };
}

/** One-bed placement overrides matching templates, without deleting other wards' relative rules. */
export function placeBedAfter(config: RoundingConfig, bedNumber: string, afterId: string, kind: RoundingBlock["kind"]): RoundingConfig {
  const bed = normalizeBedNumber(bedNumber);
  if (!bed) throw new Error("请输入完整床号");
  if (afterId && !config.blocks.some(block => block.id === afterId)) throw new Error("目标位置已更改，请重新选择");
  const blocks = config.blocks.map(block => ({ ...block, beds: block.beds.filter(value => bedKey(value) !== bedKey(bed)) }));
  const at = afterId ? blocks.findIndex(block => block.id === afterId) + 1 : 0;
  blocks.splice(at, 0, { id: uid(), kind, beds: [bed] });
  const cleaned = blocks.filter(block => block.beds.length > 0 || !config.blocks.find(old => old.id === block.id)?.beds.length);
  return { ...config, ruleType: "custom", blocks: cleaned };
}
