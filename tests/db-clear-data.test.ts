import { describe, it, expect, beforeEach } from "vitest";
import {
  db,
  clearAllData,
  getSettings,
  defaultRoundingConfig,
  defaultQuickTodos,
  defaultCustomGroups,
} from "@/lib/db";

// 回归点 1：clearAllData() 在事务内清空 patients/todos 后重写 settings，
// 必须保留 customGroups 与 listDirection（修复前会静默丢弃）。
describe("clearAllData 字段保留", () => {
  beforeEach(async () => {
    await db.patients.clear();
    await db.todos.clear();
    await db.settings.clear();
  });

  it("清空病人/待办数据后仍保留 customGroups 与 listDirection", async () => {
    const customGroups = [{ id: "g-x", name: "测试组", color: "#abc" }];
    const listDirection = "reverse";

    // 写入一条含自定义分组与反向列表的 settings
    await db.settings.put({
      id: 1,
      roundingOrder: defaultRoundingConfig(),
      listDirection,
      quickTodos: defaultQuickTodos(),
      customGroups,
      theme: "light",
      bedTemplate: "^(\\d{3})([A-Z])([A-Z]{0,2})?(\\d{2})$",
      specialMarks: ["J", "YZ"],
    } as never);

    // 写一些病人/待办，验证 clearAllData 确实会清掉它们
    await db.patients.add({
      id: "p-x",
      bedNumber: "309W01",
      name: "张三",
    } as never);
    await db.todos.add({
      id: "t-x",
      content: "换药",
      status: "pending",
      createdAt: 1,
    } as never);

    await clearAllData();

    const s = await getSettings();
    // 关键回归断言：自定义字段未被重置/丢失
    expect(s.customGroups).toEqual(customGroups);
    expect(s.listDirection).toBe("reverse");
    // settings 行仍存在
    expect(s.id).toBe(1);
    // 业务数据已被清空
    expect(await db.patients.count()).toBe(0);
    expect(await db.todos.count()).toBe(0);
  });

  it("仅在字段确实缺失时才回落到默认值", async () => {
    // 故意不写 customGroups / listDirection
    await db.settings.put({
      id: 1,
      roundingOrder: defaultRoundingConfig(),
      theme: "light",
      quickTodos: defaultQuickTodos(),
    } as never);

    await clearAllData();
    const s = await getSettings();
    expect(s.customGroups).toEqual(defaultCustomGroups());
    expect(s.listDirection).toBe("forward");
  });
});
