import { BedType } from "@/types";

export const DEFAULT_BED_TEMPLATE = "^(\\d{3})([A-Z])([A-Z]{0,2})?(\\d{2})$";
export const DEFAULT_SPECIAL_MARKS = ["J", "YZ"];

export interface BedParseResult {
  bedNumber: string;
  matched: boolean;
  ward: string; // 病区 (基底 + 方位)
  specialType: string; // '' | 'J' | 'YZ' ...
  bedBase: number; // 基础床号数值
  // 床型完全由床号解析自动判定：
  // 匹配床号模板 → real（病房床）/ extra-real（真实加床，带特殊标记）；
  // 不匹配任何床号模板 → virtual（虚拟床）。
  bedType: BedType;
}

function trailingDigits(s: string): number | null {
  if (!s) return null;
  const m = s.match(/(\d+)\D*$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return isNaN(n) ? null : n;
}

/**
 * Parse a bed number using a configurable regex template.
 * Expected capture groups: (wardBase)(wardDir)(special?)(bedBase)
 * - ward = group1 + group2
 * - specialType = group3
 * - bedBase = group4 (numeric)
 *
 * 床型完全由解析结果决定：
 * - 匹配床号模板且带特殊标记 → "extra-real"（真实加床，按真实床计）；
 * - 匹配床号模板但不带特殊标记 → "real"（病房床）；
 * - 不匹配任何床号模板（含空床号、畸形模板） → "virtual"（虚拟床）。
 * 解析结果绝不会为未匹配床号返回 "real"。
 */
export function parseBed(
  bedNumber: string,
  template: string = DEFAULT_BED_TEMPLATE,
  specialMarks: string[] = DEFAULT_SPECIAL_MARKS
): BedParseResult {
  if (!bedNumber) {
    return {
      bedNumber: bedNumber ?? "",
      matched: false,
      ward: "",
      specialType: "",
      bedBase: 0,
      // 空床号不匹配任何模板，按虚拟床（脏数据兜底）处理。
      bedType: "virtual",
    };
  }

  const fallback: BedParseResult = {
    bedNumber,
    matched: false,
    ward: "",
    specialType: "",
    bedBase: trailingDigits(bedNumber) ?? 0,
    // 不匹配任何床号模板 → 虚拟床（关键修复：不再静默兜底成 "real"）。
    bedType: "virtual",
  };

  let re: RegExp;
  try {
    re = new RegExp(template);
  } catch {
    return fallback;
  }

  const m = bedNumber.match(re);
  if (!m) {
    // try to infer ward from leading digits + letter
    const wm = bedNumber.match(/^(\d+)([A-Za-z])/);
    if (wm) {
      return {
        ...fallback,
        ward: wm[1] + wm[2].toUpperCase(),
      };
    }
    return fallback;
  }

  // 模板匹配成功 → 判定为真实床（或带特殊标记的真实加床）。
  // 提取「组数无关 + 防崩」：捕获组缺失时回退为空串/兜底数值，避免 m[i].toUpperCase() 抛错。
  // 不再用 m.length < 5 这种隐含「恰有 4 个捕获组」的过严假设——
  // 自定义模板捕获组数≠4（如 3 组 ^([A-Z])(\d{3})(\d{2})$）时，合法匹配本应判为 real，
  // 旧逻辑却因 m.length=4 < 5 误入兜底分支、推断不出病区而返回 virtual，导致该床被隐藏。
  const special = (m[3] || "").toUpperCase();
  const isSpecial = specialMarks.includes(special);
  const bedType: BedType = isSpecial ? "extra-real" : "real";

  const wardBase = m[1] || "";
  const wardDir = m[2] || "";
  const ward = (wardBase + wardDir).toUpperCase();

  const bedBaseRaw = m[4];
  const bedBase =
    bedBaseRaw != null ? parseInt(bedBaseRaw, 10) : trailingDigits(bedNumber) ?? 0;

  return {
    bedNumber,
    matched: true,
    ward,
    specialType: special,
    bedBase: isNaN(bedBase) ? 0 : bedBase,
    bedType,
  };
}
