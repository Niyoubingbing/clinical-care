import type { Patient, RoundingConfig } from "@/types";
import type { PatientStatus } from "@/lib/reminders";
import { computeBedType } from "@/lib/bed-type";

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
 * 床型判定所需的 Settings 子集。
 * v2.17.2 起虚拟床判定只看查房顺序（roundingOrder）与强制虚拟名单（virtualOverrides），
 * 不再依赖床号解析模板（bedTemplate / specialMarks 仅用于展示解析）。
 */
export interface BedFilterSettings {
  roundingOrder?: RoundingConfig;
  virtualOverrides?: string[];
}

/**
 * 首页列表过滤：虚拟床隐藏 + 分组筛选（纯函数，不依赖 React）。
 *
 * 虚拟床判定统一走 lib/bed-type 的 computeBedType（双口径，与 resolveOrder 一致）：
 * 床号不在 settings.roundingOrder 的任何 room/extra 块里（或命中 virtualOverrides）即为虚拟床。
 *
 * - 当 showVirtualBeds=false（关闭「显示虚拟床」）时：
 *     · 单卡：computeBedType === "virtual" 即剔除；
 *     · 整组：组内成员逐个过滤，仅当**全部**为虚拟才剔除整组；
 *             部分虚拟时仅保留真实成员（避免 virtualOverrides 把同房真实床一起藏掉）。
 * - 分组筛选：group 为 null 时不过滤；否则只保留含该分组病人的单卡 / 整组。
 * - 本函数**不重排**输入顺序，rows 已是查房顺序的有序序列，过滤后顺序不变。
 * - settings 缺失（首帧未加载）时按「无查房配置」处理：所有床视为虚拟床，
 *   与 computeBedType 的兜底语义保持一致。
 */
export function filterHomeRows(
  rows: HomeRow[],
  group: string | null,
  showVirtualBeds: boolean,
  settings?: BedFilterSettings | null
): HomeRow[] {
  const roundingOrder = settings?.roundingOrder;
  const virtualOverrides = settings?.virtualOverrides;

  const isVirtual = (p: Patient): boolean =>
    computeBedType(p, roundingOrder, virtualOverrides) === "virtual";

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
