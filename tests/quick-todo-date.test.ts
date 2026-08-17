import { describe, it, expect, beforeEach } from "vitest";
import { db, addPatient, addTodo } from "@/lib/db";
import { inferTodoType, parseTime } from "@/lib/time-parser";

// 聚焦集成测试：复刻 QuickTodoBar.onAdd 的建待办逻辑
//   const p = parseTime(text);
//   addTodo({ patientId, content: text, type: inferTodoType(text), dueDate: p?.date });
// 验证「快捷待办添加」能正确：① 按内容解析出 tomorrow 的 dueDate，
// ② 把含「出院」的内容归类为 "出院" 类型（修复前的回归点）。
describe("QuickTodoBar.onAdd 行为：日期解析 + 类型推断", () => {
  beforeEach(async () => {
    await db.patients.clear();
    await db.todos.clear();
  });

  it("纯函数组合：'明天出院' 解析为明天日期且类型为 '出院'", () => {
    const text = "明天出院";
    const p = parseTime(text);
    const type = inferTodoType(text);

    // 日期应为明天
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const d = String(tomorrow.getDate()).padStart(2, "0");
    const expected = `${y}-${m}-${d}`;

    expect(p?.date).toBe(expected);
    expect(type).toBe("出院");
  });

  it("端到端：经由 onAdd 等价逻辑写入 db 的待办携带 dueDate 与正确 type", async () => {
    const pid = await addPatient({
      bedNumber: "309W01",
      name: "王五",
      diagnosis: "待出院",
    });

    const text = "明天出院";
    const p = parseTime(text);
    const tid = await addTodo({
      patientId: pid,
      content: text,
      type: inferTodoType(text),
      dueDate: p?.date,
    });

    const saved = await db.todos.get(tid);
    expect(saved).toBeDefined();
    expect(saved?.type).toBe("出院");
    expect(saved?.dueDate).toBe(parseTime(text)?.date);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const d = String(tomorrow.getDate()).padStart(2, "0");
    expect(saved?.dueDate).toBe(`${y}-${m}-${d}`);
  });

  it("普通快捷待办（如'换药'）同样解析 tomorrow 日期且 type 正确", async () => {
    const pid = await addPatient({
      bedNumber: "309W02",
      name: "赵六",
      diagnosis: "",
    });

    const text = "明天换药";
    const p = parseTime(text);
    const tid = await addTodo({
      patientId: pid,
      content: text,
      type: inferTodoType(text),
      dueDate: p?.date,
    });

    const saved = await db.todos.get(tid);
    expect(saved?.type).toBe("换药");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const d = String(tomorrow.getDate()).padStart(2, "0");
    expect(saved?.dueDate).toBe(`${y}-${m}-${d}`);
  });
});
