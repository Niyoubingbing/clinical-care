import { beforeEach, describe, expect, it } from "vitest";
import { resolveOrder } from "@/lib/rounding";
import { computeBedType } from "@/lib/bed-type";
import { parseBed } from "@/lib/bed-parser";
import { importConfigText, basicRuleFromCounts } from "@/lib/rounding-edit";
import { db, getSettings, updateSettings } from "@/lib/db";
import { saveRoundingConfig } from "@/lib/rounding-settings";
import type { Patient, RoundingConfig } from "@/types";

const patient = (bedNumber: string): Patient => ({ ...parseBed(bedNumber), id: bedNumber, name: "回归测试", diagnosis: "", createdAt: 0, updatedAt: 0 });
const patients = ["309W01", "309W02", "309WJ04"].map(patient);
const config = (bed: string): RoundingConfig => ({ ruleType: "custom", blocks: [{ id: "extra", kind: "extra", beds: [bed] }, { id: "room", kind: "room", beds: ["01", "02"] }] });
describe("加床识别与排序修复", () => {
  it.each(["J04", "309WJ04"])("基础规则混用 %s，普通床和加床均按块排列", bed => {
    const rows = resolveOrder(config(bed), patients);
    expect(rows.map(row => row.patient.bedNumber)).toEqual(["309WJ04", "309W01", "309W02"]);
    expect(rows.every(row => row.groupId !== null)).toBe(true);
    expect(computeBedType(patients[2], config(bed))).toBe("extra-real");
    expect(computeBedType(patients[0], config(bed))).toBe("real");
  });
  it("数字加床不抢占同号普通床，J 与 YZ 简写互不混淆", () => {
    const ps = ["309W01", "309WJ01", "309WYZ01"].map(patient);
    expect(resolveOrder(config("01"), ps).map(row => row.patient.bedNumber)).toEqual(["309WJ01", "309WYZ01", "309W01"]);
    expect(computeBedType(ps[0], config("01"))).toBe("real");
    expect(computeBedType(ps[2], config("J01"))).toBe("virtual");
    expect(computeBedType(ps[2], config("YZ01"))).toBe("extra-real");
  });
  it("混合模板逐病区套用，完整床号不会串到其他病区", () => {
    const ps = ["309W01", "309WJ04", "310W01", "310WJ04", "独立床"].map(patient);
    const rows = resolveOrder(config("309WJ04"), ps);
    expect(rows.map(row => row.patient.bedNumber)).toEqual(["309WJ04", "309W01", "310W01", "独立床", "310WJ04"]);
    for (const row of rows) expect(computeBedType(row.patient, config("309WJ04")) !== "virtual").toBe(row.groupId !== null);
    expect(resolveOrder(config("J04"), ps).filter(r => r.groupId).map(r => r.patient.bedNumber)).toEqual(["309WJ04", "309W01", "310WJ04", "310W01"]);
  });
  it("完整床号显式移动优先于基础模板，同一病人仅出现一次", () => {
    const c: RoundingConfig = { ruleType: "custom", blocks: [{ id: "template", kind: "room", beds: ["01", "02"] }, { id: "moved", kind: "extra", beds: ["309W01"] }] };
    const rows = resolveOrder(c, patients);
    expect(rows.find(r => r.patient.bedNumber === "309W01")?.groupId).toBe("moved#309W");
    expect(rows.map(r => r.patient.bedNumber)).toEqual(["309W02", "309W01", "309WJ04"]);
    expect(computeBedType(patients[0], c)).toBe("extra-real");
    expect(new Set(rows.map(r => r.patient.id)).size).toBe(patients.length);
    expect(computeBedType(patients[0], c, ["309W01"])).toBe("virtual");
  });
  it("同号子床全部入列，完整床号仍精确匹配", () => {
    const ps = ["309W01", "309W01-1", "309W01-2"].map(patient);
    const rows = resolveOrder(config("J04"), ps);
    expect(rows.every(r => r.groupId === "room#309W")).toBe(true);
    const full: RoundingConfig = { ruleType: "custom", blocks: [{ id: "r", kind: "room", beds: ["309W01"] }] };
    expect(computeBedType(ps[1], full)).toBe("virtual");
  });
  it("保留房内顺序，拒绝重复块编号与块内床号，不无限生成", () => {
    const c = importConfigText(JSON.stringify({ blocks: [{ id: "r", kind: "room", beds: ["02", "01"] }] }))!;
    expect(resolveOrder(c, patients).slice(0, 2).map(r => r.patient.bedNumber)).toEqual(["309W02", "309W01"]);
    expect(importConfigText(JSON.stringify({ blocks: [{ id: "r", kind: "room", beds: ["01", "01"] }] }))).toBeNull();
    expect(importConfigText(JSON.stringify({ blocks: [{ id: "r", kind: "room", beds: [] }, { id: "r", kind: "extra", beds: [] }] }))).toBeNull();
    expect(basicRuleFromCounts(Infinity, 1)).toEqual([]);
  });
  it("完整自定义床号无需符合内置 309W 模板", () => {
    const ps = [patient("北区-加床7")];
    const c: RoundingConfig = { ruleType: "custom", blocks: [{ id: "e", kind: "extra", beds: ["北区-加床7"] }] };
    expect(computeBedType(ps[0], c)).toBe("extra-real");
    expect(resolveOrder(c, ps)[0].groupId).toBe("e");
  });
});
describe("查房配置持久化", () => {
  beforeEach(async () => { await db.settings.clear(); });
  it("相同基线并发修改只接受一次，不悄悄覆盖另一页面", async () => {
    const s = await getSettings();
    const first = config("J04"); const second = config("YZ04");
    const outcomes = await Promise.allSettled([saveRoundingConfig(s.roundingOrder, first), saveRoundingConfig(s.roundingOrder, second)]);
    expect(outcomes.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter(r => r.status === "rejected")).toHaveLength(1);
  });
  it("顺序更新不会覆盖同时修改的虚拟床显示偏好", async () => {
    const s = await getSettings(); const next = config("J04");
    await Promise.all([saveRoundingConfig(s.roundingOrder, next), updateSettings({ showVirtualBeds: false })]);
    const saved = await getSettings();
    expect(saved.roundingOrder).toEqual(next); expect(saved.showVirtualBeds).toBe(false);
  });
});
