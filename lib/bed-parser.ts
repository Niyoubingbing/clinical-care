import { BedType } from "@/types";

export const DEFAULT_BED_TEMPLATE = "^(\\d{3})([A-Z])([A-Z]{0,2})?(\\d{2})$";
export const DEFAULT_SPECIAL_MARKS = ["J", "YZ"];

export interface BedParseResult {
  bedNumber: string;
  matched: boolean;
  ward: string; // 病区 (基底 + 方位)
  specialType: string; // '' | 'J' | 'YZ' ...
  bedBase: number; // 基础床号数值
  bedType: BedType; // real | extra-real (virtual 由人工在设置中覆盖)
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
      bedType: "real",
    };
  }

  const fallback: BedParseResult = {
    bedNumber,
    matched: false,
    ward: "",
    specialType: "",
    bedBase: trailingDigits(bedNumber) ?? 0,
    bedType: "real",
  };

  let re: RegExp;
  try {
    re = new RegExp(template);
  } catch {
    return fallback;
  }

  const m = bedNumber.match(re);
  if (!m || m.length < 5) {
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

  const wardBase = m[1];
  const wardDir = m[2];
  const special = m[3] || "";
  const bedBase = parseInt(m[4], 10);
  const ward = wardBase + wardDir.toUpperCase();

  const isSpecial = specialMarks.includes(special.toUpperCase());
  const bedType: BedType = isSpecial ? "extra-real" : "real";

  return {
    bedNumber,
    matched: true,
    ward,
    specialType: special.toUpperCase(),
    bedBase: isNaN(bedBase) ? 0 : bedBase,
    bedType,
  };
}
