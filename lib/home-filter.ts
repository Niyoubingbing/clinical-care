import type { Patient, RoundingConfig } from "@/types";
import type { PatientStatus } from "@/lib/reminders";
import { computeBedType } from "@/lib/bed-type";
import { recognizeBed, type RecognitionSettings } from "./bed-identity";

/**
 * 首页列表行结构（与 app/page.tsx 中的 rows 一致）。
 * single 为独立病人卡，group 为同一病房块内连续病人的整组卡。
 * 单独抽离类型便于在组件外对「虚拟床隐藏 / 分组筛选」做纯函数单测。
 */
export interface HomeGroupItem {
  patient: Patient;
  todoCount: number;
  status: PatientStatus;
}

export type HomeRow =
  | { type: "group"; id: string; items: HomeGroupItem[] }
  | { type: "single"; patient: Patient; todoCount: number; status: PatientStatus };

/** Full application settings use independent recognition. Minimal pre-2.18 caller settings retain the legacy route-only contract. */
export interface BedFilterSettings extends RecognitionSettings {
  roundingOrder?: RoundingConfig;
  virtualOverrides?: string[];
}

/** Pure visibility/group filter; never changes route order. Unknown beds remain visible in 2.18. */
export function filterHomeRows(
  rows: HomeRow[],
  group: string | null,
  showVirtualBeds: boolean,
  settings?: BedFilterSettings | null
): HomeRow[] {
  const roundingOrder = settings?.roundingOrder;
  const virtualOverrides = settings?.virtualOverrides;

  const isVirtual = (p: Patient): boolean =>
    (settings && ("bedTemplate" in settings || "bedTypeOverrides" in settings)
      ? recognizeBed(p, settings)
      : computeBedType(p, roundingOrder, virtualOverrides)) === "virtual";

  const result: HomeRow[] = [];
  for (const g of rows) {
    if (g.type === "single") {
      if (!showVirtualBeds && isVirtual(g.patient)) continue;
      if (group !== null && g.patient.group !== group) continue;
      result.push(g);
    } else {
      let items = g.items;
      if (!showVirtualBeds) {
        const kept = items.filter((it) => !isVirtual(it.patient));
        if (kept.length === 0) continue; // 全虚拟 → 整组剔除
        items = kept; // 部分虚拟 → 仅保留真实成员
      }
      if (group !== null && !items.some((it) => it.patient.group === group)) continue;
      result.push(items === g.items ? g : { ...g, items });
    }
  }
  return result;
}
