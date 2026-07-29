import type { Patient } from "@/types";
import type { PatientStatus } from "@/lib/reminders";

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

/**
 * 首页列表过滤：虚拟床隐藏 + 分组筛选（纯函数，不依赖 React）。
 *
 * 虚拟床判定以「人工在设置-床号识别写入的 Patient.bedType === "virtual"」为准，
 * 而**不是** parseBed 的解析结果（parseBed 仅返回 "real" / "extra-real"）。
 *
 * - 当 showVirtualBeds=false（关闭「显示虚拟床」）时：
 *     · 单卡：patient.bedType === "virtual" 即剔除；
 *     · 整组：组内任一 item.patient.bedType === "virtual" 即整组剔除。
 * - 分组筛选：group 为 null 时不过滤；否则只保留含该分组病人的单卡 / 整组。
 * - 本函数**不重排**输入顺序，rows 已是查房顺序的有序序列，过滤后顺序不变。
 */
export function filterHomeRows(
  rows: HomeRow[],
  group: string | null,
  showVirtualBeds: boolean
): HomeRow[] {
  return rows.filter((g) => {
    if (!showVirtualBeds) {
      const isVirtual =
        g.type === "single"
          ? g.patient.bedType === "virtual"
          : g.items.some((it) => it.patient.bedType === "virtual");
      if (isVirtual) return false;
    }
    return g.type === "single"
      ? group === null || g.patient.group === group
      : g.items.some((it) => group === null || it.patient.group === group);
  });
}
