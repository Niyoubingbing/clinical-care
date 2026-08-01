import type { BedType, RoundingBlock, RoundingConfig } from "@/types";
import { isFullBed } from "./rounding-edit";

/**
 * 床型（真实 / 真实加床 / 虚拟）的**唯一权威判定入口**。
 *
 * 匹配口径与 lib/rounding 的 resolveOrder 完全一致（v2.17.2 起）：
 *   - 若任一块内存有「完整床号」（isFullBed 命中，即默认规则）→ 按床号**精确匹配**；
 *   - 否则（基础规则：块内存 "01"/"02" 这类基础床号）→ 按 **bedBase 数值**匹配。
 * 这样在基础规则下，病人仍能被正确判定为真实床，而不是因为只做了精确全床号匹配
 * 而被全部判为虚拟床（历史缺陷：关掉「隐藏虚拟床」开关会清空首页）。
 *
 * 床型结果：
 *   - 床号在某个 kind="extra"（含旧数据 kind="extra-real"）块中 → "extra-real"（真实加床）
 *   - 床号在某个 kind="room" 块中 → "real"（病房床）
 *   - 两者都不在（即不在查房列表里） → "virtual"（虚拟床）
 *
 * 匹配为精确字符串匹配（大小写敏感）；子床号（如 "309W41-1"）不等同于 "309W41"。
 *
 * parseBed 仍负责解析 ward / bedBase / specialType，但那些结果**仅用于展示**，
 * 其 bedType 字段不再参与真实/虚拟判定。
 *
 * 注意：本函数不再接收裸床号字符串，而是接收包含 ward / bedBase 的病人对象（或子集），
 * 因为基础规则下判定需要 bedBase；调用点请传完整 Patient 或 { bedNumber, ward, bedBase }。
 */

/** 旧数据兼容：历史版本的真实加床块 kind 曾写作 "extra-real"（见 lib/db.ts migrateRoundingOrder）。 */
type LegacyBlockKind = RoundingBlock["kind"] | "extra-real";

/** 读取块 kind（含旧数据字面量），避免直接断言导致的类型收窄丢失。 */
function blockKindOf(block: RoundingBlock): LegacyBlockKind {
  return (block as { kind: LegacyBlockKind }).kind;
}

/** 床型判定所需的病人信息子集：床号 + 病区 + 基础床号。 */
export interface BedTypeInput {
  bedNumber?: string | null;
  ward?: string | null;
  bedBase?: number | null;
}

/**
 * 计算床号对应的床型。
 *
 * @param p 病人对象或子集，需提供 bedNumber；基础规则下还需 bedBase。
 * @param roundingOrder 查房顺序配置；缺失 / 无块时一律返回 "virtual"。
 * @param virtualOverrides 强制虚拟床名单（settings.virtualOverrides），命中即强制 "virtual"。
 * @returns "real" | "extra-real" | "virtual"
 */
export function computeBedType(
  p: BedTypeInput,
  roundingOrder?: RoundingConfig | null,
  virtualOverrides?: readonly string[] | null
): BedType {
  const bed = p.bedNumber ?? "";
  // 空床号属脏数据，按虚拟床兜底（绝不静默判为真实床）。
  if (!bed) return "virtual";

  // 强制覆盖优先级最高：极少数场景下用户手动把某床钉死为虚拟床。
  if (Array.isArray(virtualOverrides) && virtualOverrides.includes(bed)) {
    return "virtual";
  }

  // roundingOrder 既接受完整 RoundingConfig（带 .blocks），也接受裸 RoundingBlock[] 数组
  // （如基础规则测试里直接传入 basicRuleFromCounts 的返回值），两种形态都要兼容。
  const blocks: RoundingBlock[] | undefined = Array.isArray(roundingOrder)
    ? roundingOrder
    : roundingOrder?.blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) return "virtual";

  // 双口径判定（与 resolveOrder 一致）：
  // 任一块含完整床号 → 走精确床号匹配；否则走 bedBase 数值匹配（基础规则）。
  const useFull = blocks.some(
    (b) => Array.isArray(b?.beds) && b.beds.some((x) => isFullBed(x))
  );

  for (const block of blocks) {
    if (!block || !Array.isArray(block.beds)) continue;
    const matched = useFull
      ? block.beds.includes(bed)
      : block.beds.some((b) => parseInt(b, 10) === (p.bedBase ?? -1));
    if (matched) {
      const kind = blockKindOf(block);
      return kind === "extra" || kind === "extra-real" ? "extra-real" : "real";
    }
  }

  return "virtual";
}

/** 便捷判定：床号是否为虚拟床（与 computeBedType 同源，避免各处重复比较字面量）。 */
export function isVirtualBed(
  p: BedTypeInput,
  roundingOrder?: RoundingConfig | null,
  virtualOverrides?: readonly string[] | null
): boolean {
  return computeBedType(p, roundingOrder, virtualOverrides) === "virtual";
}

/** 床号是否已出现在查房顺序的任一块中（忽略强制虚拟覆盖），用于设置页展示「是否入列」。 */
export function isBedInRoundingOrder(
  p: BedTypeInput,
  roundingOrder?: RoundingConfig | null
): boolean {
  const bed = p.bedNumber ?? "";
  if (!bed) return false;
  const blocks: RoundingBlock[] | undefined = Array.isArray(roundingOrder)
    ? roundingOrder
    : roundingOrder?.blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) return false;
  const useFull = blocks.some(
    (b) => Array.isArray(b?.beds) && b.beds.some((x) => isFullBed(x))
  );
  return blocks.some((block) => {
    if (!block || !Array.isArray(block.beds)) return false;
    return useFull
      ? block.beds.includes(bed)
      : block.beds.some((b) => parseInt(b, 10) === (p.bedBase ?? -1));
  });
}
