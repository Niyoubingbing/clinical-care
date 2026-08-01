import { describe, it, expect } from "vitest";
import {
  computeBedType,
  isVirtualBed,
  isBedInRoundingOrder,
} from "@/lib/bed-type";
import type { RoundingBlock, RoundingConfig } from "@/types";
import { basicRuleFromCounts } from "@/lib/rounding-edit";

/** 构造一个典型查房配置：2 个病房块 + 1 个真实加床块。 */
function mkConfig(blocks: RoundingBlock[]): RoundingConfig {
  return { ruleType: "custom", blocks };
}

const CONFIG = mkConfig([
  { id: "b1", kind: "room", ward: "309W", beds: ["309W41", "309W42", "309W43"] },
  { id: "b2", kind: "extra", beds: ["309WJ04"] },
  { id: "b3", kind: "room", ward: "309W", beds: ["309W01", "309W02"] },
]);

describe("computeBedType - 以查房顺序为唯一判定来源", () => {
  it("床号在 room 块里 → real", () => {
    expect(computeBedType({ bedNumber: "309W41" }, CONFIG)).toBe("real");
    expect(computeBedType({ bedNumber: "309W02" }, CONFIG)).toBe("real");
  });

  it("床号在 extra 块里 → extra-real", () => {
    expect(computeBedType({ bedNumber: "309WJ04" }, CONFIG)).toBe("extra-real");
  });

  it("床号不在任何块里 → virtual（哪怕完全符合床号模板）", () => {
    // 309W99 能被默认解析模板匹配，但不在查房列表里 → 仍是虚拟床。
    expect(computeBedType({ bedNumber: "309W99" }, CONFIG)).toBe("virtual");
    expect(computeBedType({ bedNumber: "V09" }, CONFIG)).toBe("virtual");
  });

  it("精确匹配：大小写不同不算命中 → virtual", () => {
    expect(computeBedType({ bedNumber: "309w41" }, CONFIG)).toBe("virtual");
    expect(computeBedType({ bedNumber: "309WJ04 " }, CONFIG)).toBe("virtual");
  });

  it("精确匹配：子床号（309W41-1）不等同于 309W41 → virtual", () => {
    expect(computeBedType({ bedNumber: "309W41-1" }, CONFIG)).toBe("virtual");
  });

  it("兼容旧数据 kind=\"extra-real\" 的加床块 → extra-real", () => {
    const legacy = {
      ruleType: "custom",
      blocks: [{ id: "old", kind: "extra-real", beds: ["309WJ09"] }],
    } as unknown as RoundingConfig;
    expect(computeBedType({ bedNumber: "309WJ09" }, legacy)).toBe("extra-real");
  });

  it("roundingOrder 缺失 / 无块 / 空床号 → virtual", () => {
    expect(computeBedType({ bedNumber: "309W41" }, undefined)).toBe("virtual");
    expect(computeBedType({ bedNumber: "309W41" }, mkConfig([]))).toBe("virtual");
    expect(computeBedType({ bedNumber: "" }, CONFIG)).toBe("virtual");
  });

  it("virtualOverrides 命中时强制 virtual（优先级高于块匹配）", () => {
    expect(computeBedType({ bedNumber: "309W41" }, CONFIG, ["309W41"])).toBe("virtual");
    expect(computeBedType({ bedNumber: "309WJ04" }, CONFIG, ["309WJ04"])).toBe("virtual");
    // 未命中名单的床不受影响
    expect(
      computeBedType({ bedNumber: "309W42" }, CONFIG, ["309W41"])
    ).toBe("real");
  });

  it("基础规则（块内存基础床号）：按 bedBase 匹配 → real（不再全判 virtual）", () => {
    const basic = basicRuleFromCounts(4, 2);
    // 309W01 / 309W03 落在基础块 [01,02] / [03,04]（bedBase 1 / 3），精确命中 → real
    expect(
      computeBedType(
        { bedNumber: "309W01", ward: "309W", bedBase: 1 },
        basic,
        []
      )
    ).toBe("real");
    expect(
      computeBedType(
        { bedNumber: "309W03", ward: "309W", bedBase: 3 },
        basic,
        []
      )
    ).toBe("real");
    // bedBase 不在任何块里（99）→ virtual
    expect(
      computeBedType(
        { bedNumber: "309W99", ward: "309W", bedBase: 99 },
        basic,
        []
      )
    ).toBe("virtual");
  });
});

describe("isVirtualBed / isBedInRoundingOrder", () => {
  it("isVirtualBed 与 computeBedType 同源", () => {
    expect(isVirtualBed({ bedNumber: "309W41" }, CONFIG)).toBe(false);
    expect(isVirtualBed({ bedNumber: "309WJ04" }, CONFIG)).toBe(false);
    expect(isVirtualBed({ bedNumber: "309W99" }, CONFIG)).toBe(true);
    expect(
      isVirtualBed({ bedNumber: "309W41" }, CONFIG, ["309W41"])
    ).toBe(true);
  });

  it("isBedInRoundingOrder 只看块归属，忽略强制虚拟名单", () => {
    expect(isBedInRoundingOrder({ bedNumber: "309W41" }, CONFIG)).toBe(true);
    expect(isBedInRoundingOrder({ bedNumber: "309W99" }, CONFIG)).toBe(false);
    expect(isBedInRoundingOrder({ bedNumber: "309W41" }, undefined)).toBe(false);
    expect(isBedInRoundingOrder({ bedNumber: "" }, CONFIG)).toBe(false);
  });
});
