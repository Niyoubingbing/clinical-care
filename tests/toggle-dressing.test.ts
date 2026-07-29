import { describe, it, expect, beforeEach } from "vitest";
import { db, addPatient, addTodo, toggleTodo, defaultSettings, todayStr } from "@/lib/db";
import { dressingInfo, resolveSchedule } from "@/lib/dressing";
import { needsDressing } from "@/lib/reminders";
import { Patient, Settings, DressingSchedule } from "@/types";

// 新换药模型（v2.17）：完成「换药」待办不再写 lastDressingChange，
// 而是由「手术日计划」驱动（dressingInfo 基于 isDressingDay + doneToday 判定）。
// 此测试断言新语义：完成今日换药待办后 doneToday 为真、needsDressing 为假。
describe("换药模型：完成今日换药待办的新语义", () => {
  const schedule: DressingSchedule = { earlyInterval: 2, laterInterval: 3, maxDay: 14 };

  beforeEach(async () => {
    await db.patients.clear();
    await db.todos.clear();
  });

  // 让病人今天正好是首个换药日（POD2）
  function surgeryDateForPod2(today: string): string {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - 2);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  it("完成今日换药待办后，不再写入 lastDressingChange，且 dressingInfo.doneToday 为真", async () => {
    const today = todayStr();
    const pid = await addPatient({
      bedNumber: "309W01",
      name: "张三",
      diagnosis: "术后",
      surgeryDate: surgeryDateForPod2(today),
    });
    const tid = await addTodo({
      patientId: pid,
      content: "换药",
      type: "换药",
      dueDate: today,
    });

    await toggleTodo(tid, true);

    // 新模型：完成换药待办不再写 lastDressingChange
    const after = await db.patients.get(pid);
    expect(after?.lastDressingChange).toBeUndefined();

    const p = (await db.patients.get(pid)) as Patient;
    const todos = await db.todos.toArray();
    const settings = { ...defaultSettings(), dressingSchedule: schedule } as Settings;
    const info = dressingInfo(p, resolveSchedule(p, settings), todos, today);
    expect(info.doneToday).toBe(true);
    expect(info.isDressingDay).toBe(true);
  });

  it("完成今日换药待办后，needsDressing 为假（已换）", async () => {
    const today = todayStr();
    const pid = await addPatient({
      bedNumber: "309W02",
      name: "李四",
      diagnosis: "术后",
      surgeryDate: surgeryDateForPod2(today),
    });
    const tid = await addTodo({
      patientId: pid,
      content: "换药",
      type: "换药",
      dueDate: today,
    });
    await toggleTodo(tid, true);

    const p = (await db.patients.get(pid)) as Patient;
    const todos = await db.todos.toArray();
    const settings = { ...defaultSettings(), dressingSchedule: schedule } as Settings;
    expect(needsDressing(p, resolveSchedule(p, settings), todos, today)).toBe(false);
  });

  it("未完成今日换药待办时，needsDressing 为真", async () => {
    const today = todayStr();
    const pid = await addPatient({
      bedNumber: "309W03",
      name: "王五",
      diagnosis: "术后",
      surgeryDate: surgeryDateForPod2(today),
    });
    await addTodo({
      patientId: pid,
      content: "换药",
      type: "换药",
      dueDate: today,
    });
    const p = (await db.patients.get(pid)) as Patient;
    const todos = await db.todos.toArray();
    const settings = { ...defaultSettings(), dressingSchedule: schedule } as Settings;
    expect(needsDressing(p, resolveSchedule(p, settings), todos, today)).toBe(true);
  });
});
