import type { BedType, Settings } from "@/types";
import { parseBed } from "./bed-parser";
import { type RoutePatient } from "./rounding-match";

export type RecognitionSettings = Pick<Settings, "bedTemplate" | "specialMarks" | "bedTypeOverrides" | "virtualOverrides"> & Partial<Pick<Settings, "roundingOrder">>;

import { bedKey, normalizeBedNumber } from "./bed-number";

export function recognizeBed(p: RoutePatient, settings: RecognitionSettings): BedType {
  const bed = normalizeBedNumber(p.bedNumber || "");
  const key = bedKey(bed);
  const manual = settings.bedTypeOverrides?.find(item => bedKey(item.bedNumber) === key);
  if (manual) return manual.type;
  if (settings.virtualOverrides?.some(value => bedKey(value) === key)) return "virtual";
  const parsed = parseBed(bed, settings.bedTemplate, settings.specialMarks);
  if (parsed.matched) return parsed.bedType;
  // Unknown is not virtual: never silently hide a patient due to an unfamiliar name.
  return "unrecognized";
}

export function bedTypeLabel(type: BedType) {
  return { real: "普通床", "extra-real": "加床", virtual: "虚拟床", unrecognized: "待确认" }[type];
}
