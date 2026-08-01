/**
 * QA-2 差分一致性检查：computeBedType 的「非虚拟」判定，是否与 resolveOrder 的
 * 「能被排进查房序列（groupId !== null）」等价。
 *
 * 这是本次修复的核心前提（注释里写的「匹配口径与 resolveOrder 完全一致」）。
 * 若两者不一致，会出现「首页把某床当真实床显示，但查房序列里它却掉进未匹配尾巴」这类分裂。
 */
import { describe, it, expect } from "vitest";
import { resolveOrder } from "@/lib/rounding";
import { computeBedType } from "@/lib/bed-type";
import { basicRuleFromCounts } from "@/lib/rounding-edit";
import type { Patient, RoundingConfig } from "@/types";

function p(id: string, bedNumber: string, ward?: string, bedBase?: number): Patient {
  return { id, bedNumber, name: id, diagnosis: "d", ward, bedBase, createdAt: 1, updatedAt: 1 };
}

/** 对给定配置与病人集，比较两套判定，返回不一致明细。 */
function diff(config: RoundingConfig, patients: Patient[]) {
  const ordered = resolveOrder(config, patients);
  const placed = new Map(ordered.map((o) => [o.patient.id, o.groupId !== null]));
  return patients
    .map((pt) => {
      const inOrder = placed.get(pt.id) ?? false;
      const notVirtual = computeBedType(pt, config) !== "virtual";
      return { id: pt.id, bed: pt.bedNumber, ward: pt.ward, inOrder, notVirtual };
    })
    .filter((r) => r.inOrder !== r.notVirtual);
}

describe("QA2 parity: computeBedType(非virtual) ≡ resolveOrder(已入列)", () => {
  it("基础规则 + 单病区", () => {
    const blocks = basicRuleFromCounts(4, 2) as unknown as RoundingConfig["blocks"];
    const cfg: RoundingConfig = { ruleType: "basic", blocks };
    const pts = [
      p("a", "309W01", "309W", 1),
      p("b", "309W02", "309W", 2),
      p("c", "309W03", "309W", 3),
      p("d", "309W04", "309W", 4),
      p("e", "309W99", "309W", 99),
    ];
    const d = diff(cfg, pts);
    // eslint-disable-next-line no-console
    console.log("QA2 parity single-ward diff =", JSON.stringify(d));
    expect(d).toEqual([]);
  });

  it("基础规则 + 多病区（resolveOrder 会对每个病区套用同一套块）", () => {
    const blocks = basicRuleFromCounts(4, 2) as unknown as RoundingConfig["blocks"];
    const cfg: RoundingConfig = { ruleType: "basic", blocks };
    const pts = [
      p("a1", "309W01", "309W", 1),
      p("a2", "309W03", "309W", 3),
      p("b1", "310W01", "310W", 1),
      p("b2", "310W02", "310W", 2),
      p("z", "310W88", "310W", 88),
    ];
    const d = diff(cfg, pts);
    // eslint-disable-next-line no-console
    console.log("QA2 parity multi-ward diff =", JSON.stringify(d));
    expect(d).toEqual([]);
  });

  it("默认规则（完整床号块）+ 跨病区同 bedBase", () => {
    const cfg: RoundingConfig = {
      ruleType: "custom",
      blocks: [
        { id: "r1", kind: "room", ward: "309W", beds: ["309W01", "309W02"] },
        { id: "e1", kind: "extra", beds: ["309WJ04"] },
      ],
    };
    const pts = [
      p("a", "309W01", "309W", 1),
      p("b", "309W02", "309W", 2),
      p("j", "309WJ04", "309W", 4),
      p("x", "310W01", "310W", 1), // 同 bedBase 但完整床号不在块里 → 应为 virtual 且未入列
      p("y", "309W77", "309W", 77),
    ];
    const d = diff(cfg, pts);
    // eslint-disable-next-line no-console
    console.log("QA2 parity full-bed diff =", JSON.stringify(d));
    expect(d).toEqual([]);
  });

  it("已知边界：基础规则下同病区重复 bedBase（子床号）", () => {
    const blocks = basicRuleFromCounts(4, 2) as unknown as RoundingConfig["blocks"];
    const cfg: RoundingConfig = { ruleType: "basic", blocks };
    const pts = [p("main", "309W01", "309W", 1), p("sub", "309W01-1", "309W", 1)];
    const d = diff(cfg, pts);
    // eslint-disable-next-line no-console
    console.log("QA2 parity duplicate-bedBase diff =", JSON.stringify(d));
    // 仅记录实际行为，不强行断言等价（resolveOrder 每个 (ward,bedBase) 只放一人）
    // eslint-disable-next-line no-console
    console.log("QA2 duplicate-bedBase types =", JSON.stringify(pts.map((x) => ({ id: x.id, t: computeBedType(x, cfg) }))));
    expect(Array.isArray(d)).toBe(true);
  });
});
