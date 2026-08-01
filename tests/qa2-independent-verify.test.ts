/**
 * 独立验收（QA-2，v2.17.2）——不复用 engineer 的测试夹具，重新构造场景并**打印真实输出**。
 * 目的：证明 P0 / P1 两个回归场景确实被修复，而不是断言写宽了才「绿」。
 */
import { describe, it, expect } from "vitest";
import { filterHomeRows, type HomeRow } from "@/lib/home-filter";
import { computeBedType, isVirtualBed } from "@/lib/bed-type";
import { basicRuleFromCounts } from "@/lib/rounding-edit";
import type { Patient, RoundingConfig } from "@/types";
import type { PatientStatus } from "@/lib/reminders";

const ST: PatientStatus = {
  needDressing: false,
  needBlood: false,
  todayDue: false,
  overdue: false,
  postOpDay: null,
  dressingToday: false,
  nextDressingInDays: null,
};

function pt(id: string, bedNumber: string, ward?: string, bedBase?: number): Patient {
  return {
    id,
    bedNumber,
    name: "n" + id,
    diagnosis: "d",
    ward,
    bedBase,
    createdAt: 1,
    updatedAt: 1,
  };
}

const one = (p: Patient): HomeRow => ({ type: "single", patient: p, todoCount: 0, status: ST });
const grp = (id: string, ps: Patient[]): HomeRow => ({
  type: "group",
  id,
  items: ps.map((patient) => ({ patient, todoCount: 0, status: ST })),
});

/** 把过滤结果摊平成可读的病人 id 列表（组内成员也展开）。 */
function flat(rows: HomeRow[]): string[] {
  const out: string[] = [];
  for (const r of rows) {
    if (r.type === "single") out.push(r.patient.id);
    else for (const it of r.items) out.push(`${r.id}/${it.patient.id}`);
  }
  return out;
}

describe("QA2-P0 基础规则下关闭「显示虚拟床」绝不清空首页", () => {
  const basic = basicRuleFromCounts(4, 2);

  it("打印 basicRuleFromCounts(4,2) 的真实块结构", () => {
    // eslint-disable-next-line no-console
    console.log("QA2 basicRuleFromCounts(4,2) =", JSON.stringify(basic));
    const blocks = Array.isArray(basic) ? basic : basic.blocks;
    expect(Array.isArray(blocks) && blocks.length > 0).toBe(true);
  });

  it("309W01/02/03（bedBase 1/2/3）在 showVirtualBeds=false 下全部保留", () => {
    const rows: HomeRow[] = [
      one(pt("a", "309W01", "309W", 1)),
      one(pt("b", "309W02", "309W", 2)),
      one(pt("c", "309W03", "309W", 3)),
    ];
    const kept = flat(filterHomeRows(rows, null, false, { roundingOrder: basic as RoundingConfig }));
    // eslint-disable-next-line no-console
    console.log("QA2-P0 REMAIN_WHEN_HIDDEN =", JSON.stringify(kept));
    expect(kept.length).toBeGreaterThan(0); // 首页绝不能被清空
    expect(kept).toEqual(["a", "b", "c"]);
  });

  it("逐床 computeBedType 明细（基础规则应为 real，非 virtual）", () => {
    const detail = [1, 2, 3, 4, 99].map((n) => {
      const p = pt("p" + n, `309W${String(n).padStart(2, "0")}`, "309W", n);
      return { bed: p.bedNumber, bedBase: n, type: computeBedType(p, basic as RoundingConfig) };
    });
    // eslint-disable-next-line no-console
    console.log("QA2-P0 computeBedType =", JSON.stringify(detail));
    expect(detail.filter((d) => d.type !== "virtual").map((d) => d.bedBase)).toEqual([1, 2, 3, 4]);
    expect(detail.find((d) => d.bedBase === 99)?.type).toBe("virtual");
  });

  it("基础规��下真正的虚拟床仍被隐藏（隐藏能力没被改坏）", () => {
    const rows: HomeRow[] = [one(pt("real", "309W02", "309W", 2)), one(pt("virt", "309W99", "309W", 99))];
    const kept = flat(filterHomeRows(rows, null, false, { roundingOrder: basic as RoundingConfig }));
    // eslint-disable-next-line no-console
    console.log("QA2-P0 mixed kept =", JSON.stringify(kept));
    expect(kept).toEqual(["real"]);
  });
});

describe("QA2-P1 virtualOverrides 不得连坐同病房真实床", () => {
  const settings = {
    roundingOrder: {
      ruleType: "custom" as const,
      blocks: [{ id: "r1", kind: "room" as const, ward: "309W", beds: ["309W01", "309W02", "309W03"] }],
    },
    virtualOverrides: ["309W02"],
  };

  it("整组 [309W01 真实 + 309W02 强制虚拟] → 组保留，且组内只剩 309W01", () => {
    const rows: HomeRow[] = [
      grp("g1", [pt("real1", "309W01", "309W", 1), pt("virt1", "309W02", "309W", 2)]),
    ];
    const out = filterHomeRows(rows, null, false, settings);
    const kept = flat(out);
    // eslint-disable-next-line no-console
    console.log("QA2-P1 kept =", JSON.stringify(kept));
    expect(kept).toEqual(["g1/real1"]); // 同房真实床必须还在
    expect(out).toHaveLength(1);
    if (out[0].type === "group") {
      expect(out[0].items.map((i) => i.patient.id)).toEqual(["real1"]);
    }
  });

  it("整组全部被 override 成虚拟 → 整组剔除（不能只做半套）", () => {
    const all = { ...settings, virtualOverrides: ["309W01", "309W02"] };
    const rows: HomeRow[] = [
      grp("g1", [pt("real1", "309W01", "309W", 1), pt("virt1", "309W02", "309W", 2)]),
    ];
    const kept = flat(filterHomeRows(rows, null, false, all));
    // eslint-disable-next-line no-console
    console.log("QA2-P1 all-virtual kept =", JSON.stringify(kept));
    expect(kept).toEqual([]);
  });

  it("showVirtualBeds=true 时 override 成员不被剔除（开关语义正确）", () => {
    const rows: HomeRow[] = [
      grp("g1", [pt("real1", "309W01", "309W", 1), pt("virt1", "309W02", "309W", 2)]),
    ];
    const kept = flat(filterHomeRows(rows, null, true, settings));
    // eslint-disable-next-line no-console
    console.log("QA2-P1 show=true kept =", JSON.stringify(kept));
    expect(kept).toEqual(["g1/real1", "g1/virt1"]);
  });

  it("原始 rows 未被就地修改（过滤是纯函数）", () => {
    const rows: HomeRow[] = [
      grp("g1", [pt("real1", "309W01", "309W", 1), pt("virt1", "309W02", "309W", 2)]),
    ];
    filterHomeRows(rows, null, false, settings);
    const src = rows[0];
    expect(src.type === "group" && src.items).toHaveLength(2);
  });
});

describe("QA2 双口径互不串味（默认规则仍走精确匹配）", () => {
  const full: RoundingConfig = {
    ruleType: "custom",
    blocks: [{ id: "r1", kind: "room", ward: "309W", beds: ["309W01", "309W02"] }],
  };

  it("完整床号块下，bedBase 相同但床号不同的他病区床仍是 virtual", () => {
    // 310W01 的 bedBase 也是 1，但块里存的是完整床号 309W01 → 必须 virtual，不能被 bedBase 误伤放行
    const t = computeBedType(pt("x", "310W01", "310W", 1), full);
    // eslint-disable-next-line no-console
    console.log("QA2 cross-ward 310W01 type =", t);
    expect(t).toBe("virtual");
    expect(isVirtualBed(pt("x", "310W01", "310W", 1), full)).toBe(true);
    expect(computeBedType(pt("y", "309W01", "309W", 1), full)).toBe("real");
  });
});
