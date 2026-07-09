import { describe, it, expect, beforeEach } from "vitest";
import {
  db,
  addPatient,
  addTodo,
  toggleTodo,
  todayStr,
} from "@/lib/db";
import { inferTodoType, parseTime } from "@/lib/time-parser";

// 关键临床规则集成测试：完成一个 type==="换药" 的待办后，
// 其所属病人的 lastDressingChange 必须更新为今天（PRD 4.7）。
// 这里用「与 TodoFormSheet.submit 完全一致」的方式建待办：
//   type = inferTodoType(content), dueDate = parseTime(content)?.date
// 再经 lib/db.toggleTodo 完成，验证端到端链路在「表单简化」后仍成立。
describe("clinical rule: 完成换药待办联动 lastDressingChange", () => {
  beforeEach(async () => {
    await db.patients.clear();
    await db.todos.clear();
  });

  it("内容含'换药'的待办完成后，病人 lastDressingChange 更新为今天", async () => {
    const pid = await addPatient({
      bedNumber: "309W01",
      name: "张三",
      diagnosis: "术后",
    });

    // 完全复刻 TodoFormSheet.submit 的建待办逻辑
    const text = "明天换药";
    const tid = await addTodo({
      patientId: pid,
      content: text,
      type: inferTodoType(text),
      dueDate: parseTime(text)?.date,
    });

    // 完成前不应有记录
    const before = await db.patients.get(pid);
    expect(before?.lastDressingChange).toBeUndefined();

    await toggleTodo(tid, true);

    const after = await db.patients.get(pid);
    expect(after?.lastDressingChange).toBe(todayStr());
  });

  it("非换药待办完成后，不更新 lastDressingChange", async () => {
    const pid = await addPatient({
      bedNumber: "309W02",
      name: "李四",
      diagnosis: "",
    });
    const text = "查血";
    const tid = await addTodo({
      patientId: pid,
      content: text,
      type: inferTodoType(text),
      dueDate: parseTime(text)?.date,
    });

    await toggleTodo(tid, true);

    const after = await db.patients.get(pid);
    expect(after?.lastDressingChange).toBeUndefined();
  });

  it("无 patientId 的通用换药待办完成后，不抛错且状态置为 completed", async () => {
    const tid = await addTodo({
      patientId: null,
      content: "换药",
      type: inferTodoType("换药"),
    });

    await toggleTodo(tid, true);

    const t = await db.todos.get(tid);
    expect(t?.status).toBe("completed");
  });
});
