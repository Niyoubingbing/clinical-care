import type { Patient } from "@/types";
import type { PatientStatus } from "@/lib/reminders";
import { parseBed } from "@/lib/bed-parser";

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
 * 床型解析所需的 Settings 子集（床号模板 + 特殊标记）。
 * 仅取过滤所需字段，避免与完整 Settings 类型强耦合。
 */
export interface BedFilterSettings {
  bedTemplate?: string;
  specialMarks?: string[];
}

/**
 * 首页列表过滤：虚拟床隐藏 + 分组筛选（纯函数，不依赖 React）。
 *
 * 虚拟床判定**完全由床号解析结果决定**：对每个病人调用 parseBed，
 * bedType === "virtual"（不匹配任何床号模板）即视为虚拟床。
 * 手动字段 Patient.bedType 不再参与分类（仅保留作脏数据兜底）。
 *
 * - 当 showVirtualBeds=false（关闭「显示虚拟床」）时：
 *     · 单卡：解析 bedType === "virtual" 即剔除；
 *     · 整组：组内任一 item 解析为 virtual 即整组剔除。
 * - 分组筛选：group 为 null 时不过滤；否则只保留含该分组病人的单卡 / 整组。
 * - 本函数**不重排**输入顺序，rows 已是查房顺序的有序序列，过滤后顺序不变。
 */
export function filterHomeRows(
  rows: HomeRow[],
  group: string | null,
  showVirtualBeds: boolean,
  settings?: BedFilterSettings
): HomeRow[] {
  const isVirtual = (p: Patient): boolean =>
    parseBed(p.bedNumber, settings?.bedTemplate, settings?.specialMarks)
      .bedType === "virtual";

  return rows.filter((g) => {
    if (!showVirtualBeds) {
      const v =
        g.type === "single"
          ? isVirtual(g.patient)
          : g.items.some((it) => isVirtual(it.patient));
      if (v) return false;
    }
    return g.type === "single"
      ? group === null || g.patient.group === group
      : g.items.some((it) => group === null || it.patient.group === group);
  });
}
