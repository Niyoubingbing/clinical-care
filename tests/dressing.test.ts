import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveSchedule,
  dressingDays,
  postOpDay,
  nextDressingDate,
  dressingInfo,
  dressingTodoKey,
  ensureTodaysDressingTodos,
} from "@/lib/dressing";
import { db, addPatient, addTodo, defaultSettings, todayStr } from "@/lib/db";
import { Patient, Settings, Todo, DressingSchedule } from "@/types";

const DEFAULT_SCHEDULE: DressingSchedule = {
  earlyInterval: 2,
  laterInterval: 3,
  maxDay: 14,
};

function shiftDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

describe("dressingDays", () => {
  it("默认计划 {2,3,14} => [2,5,8,11,14]", () => {
    expect(dressingDays(DEFAULT_SCHEDULE)).toEqual([2, 5, 8, 11, 14]);
  });
  it("laterInterval 跨越 maxDay 时停止", () => {
    expect(dressingDays({ earlyInterval: 2, laterInterval: 5, maxDay: 14 })).toEqual([
      2, 7, 12,
    ]);
  });
  it("earlyInterval 等于 maxDay 时仅一天", () => {
    expect(dressingDays({ earlyInterval: 10, laterInterval: 3, maxDay: 10 })).toEqual([
      10,
    ]);
  });
});

describe("postOpDay", () => {
  const today = "2026-07-10";
  it("手术日当天 = 0", () => {
    expect(postOpDay("2026-07-10", today)).toBe(0);
  });
  it("术后为正", () => {
    expect(postOpDay("2026-07-08", today)).toBe(2);
  });
  it("术前为负", () => {
    expect(postOpDay("2026-07-12", today)).toBe(-2);
  });
  it("无手术日 => null", () => {
    expect(postOpDay(undefined, today)).toBeNull();
  });
});

describe("resolveSchedule", () => {
  it("无覆盖时继承全局默认", () => {
    const p = { id: "x", bedNumber: "1", name: "a", diagnosis: "d" } as Patient;
    const s = { ...defaultSettings(), dressingSchedule: DEFAULT_SCHEDULE } as Settings;
    expect(resolveSchedule(p, s)).toEqual(DEFAULT_SCHEDULE);
  });
  it("有覆盖时优先用病人计划", () => {
    const custom = { earlyInterval: 1, laterInterval: 2, maxDay: 9 };
    const p = {
      id: "x",
      bedNumber: "1",
      name: "a",
      diagnosis: "d",
      dressingSchedule: custom,
    } as Patient;
    const s = { ...defaultSettings(), dressingSchedule: DEFAULT_SCHEDULE } as Settings;
    expect(resolveSchedule(p, s)).toEqual(custom);
  });
});

describe("dressingInfo", () => {
  const today = "2026-07-10";
  it("术后第 2 天（首个换药日）且未换 => isDressingDay + nextInDays 0", () => {
    const p = {
      id: "p1",
      bedNumber: "1",
      name: "a",
      diagnosis: "d",
      surgeryDate: shiftDays(today, -2),
    } as Patient;
    const info = dressingInfo(p, DEFAULT_SCHEDULE, [], today);
    expect(info.postOpDay).toBe(2);
    expect(info.isDressingDay).toBe(true);
    expect(info.doneToday).toBe(false);
    expect(info.nextInDays).toBe(0);
  });
  it("已完成今日换药待办 => doneToday 为真", () => {
    const p = {
      id: "p1",
      bedNumber: "1",
      name: "a",
      diagnosis: "d",
      surgeryDate: shiftDays(today, -2),
    } as Patient;
    const todos: Todo[] = [
      {
        id: "t1",
        patientId: "p1",
        content: "换药",
        type: "换药",
        dueDate: today,
        status: "completed",
        createdAt: 0,
      },
    ];
    const info = dressingInfo(p, DEFAULT_SCHEDULE, todos, today);
    expect(info.doneToday).toBe(true);
    expect(info.isDressingDay).toBe(true);
    expect(info.nextInDays).toBe(0);
  });
  it("术后第 5 天（间隔日）=> isDressingDay 且 nextInDays 0", () => {
    const p = {
      id: "p1",
      bedNumber: "1",
      name: "a",
      diagnosis: "d",
      surgeryDate: shiftDays(today, -5),
    } as Patient;
    const info = dressingInfo(p, DEFAULT_SCHEDULE, [], today);
    expect(info.postOpDay).toBe(5);
    expect(info.isDressingDay).toBe(true);
    expect(info.nextInDays).toBe(0);
  });
  it("术后第 3 天（非换药日）=> isDressingDay false，nextInDays 2", () => {
    const p = {
      id: "p1",
      bedNumber: "1",
      name: "a",
      diagnosis: "d",
      surgeryDate: shiftDays(today, -3),
    } as Patient;
    const info = dressingInfo(p, DEFAULT_SCHEDULE, [], today);
    expect(info.isDressingDay).toBe(false);
    expect(info.nextInDays).toBe(2);
  });
  it("超过 maxDay => isDressingDay false，nextInDays null", () => {
    const p = {
      id: "p1",
      bedNumber: "1",
      name: "a",
      diagnosis: "d",
      surgeryDate: shiftDays(today, -15),
    } as Patient;
    const info = dressingInfo(p, DEFAULT_SCHEDULE, [], today);
    expect(info.isDressingDay).toBe(false);
    expect(info.nextInDays).toBeNull();
  });
});

describe("nextDressingDate", () => {
  const today = "2026-07-10";
  it("手术日当天（POD0）=> 首个换药日 = 第 2 天", () => {
    const p = {
      id: "p",
      bedNumber: "1",
      name: "a",
      diagnosis: "d",
      surgeryDate: today,
    } as Patient;
    expect(nextDressingDate(p, DEFAULT_SCHEDULE, today)).toBe(shiftDays(today, 2));
  });
  it("无手术日 => null", () => {
    const p = { id: "p", bedNumber: "1", name: "a", diagnosis: "d" } as Patient;
    expect(nextDressingDate(p, DEFAULT_SCHEDULE, today)).toBeNull();
  });
});

describe("dressingTodoKey", () => {
  it("格式正确", () => {
    expect(dressingTodoKey("p1", "2026-07-10")).toBe("p1|换药|2026-07-10");
  });
});

describe("ensureTodaysDressingTodos", () => {
  beforeEach(async () => {
    await db.patients.clear();
    await db.todos.clear();
  });

  it("今日是换药日时幂等补建一条今日换药待办", async () => {
    const today = todayStr();
    const pid = await addPatient({
      bedNumber: "309W01",
      name: "张三",
      diagnosis: "术后",
      surgeryDate: shiftDays(today, -2),
    });
    const settings = {
      ...defaultSettings(),
      dressingSchedule: DEFAULT_SCHEDULE,
    } as Settings;
    await ensureTodaysDressingTodos(
      await db.patients.toArray(),
      settings,
      [],
      today
    );
    let list = await db.todos.where("patientId").equals(pid).toArray();
    expect(list.length).toBe(1);
    expect(list[0].type).toBe("换药");
    expect(list[0].dueDate).toBe(today);
    expect(list[0].status).toBe("pending");

    // 再次运行应保持幂等（不重复创建）
    const refreshed = await db.todos.toArray();
    await ensureTodaysDressingTodos(
      await db.patients.toArray(),
      settings,
      refreshed,
      today
    );
    list = await db.todos.where("patientId").equals(pid).toArray();
    expect(list.length).toBe(1);
  });

  it("今日已有（已完成）换药待办时不重复创建", async () => {
    const today = todayStr();
    const pid = await addPatient({
      bedNumber: "309W02",
      name: "李四",
      diagnosis: "术后",
      surgeryDate: shiftDays(today, -2),
    });
    await addTodo({
      patientId: pid,
      content: "换药",
      type: "换药",
      dueDate: today,
      status: "completed",
    });
    const settings = {
      ...defaultSettings(),
      dressingSchedule: DEFAULT_SCHEDULE,
    } as Settings;
    const todos = await db.todos.toArray();
    await ensureTodaysDressingTodos(
      await db.patients.toArray(),
      settings,
      todos,
      today
    );
    const list = await db.todos.where("patientId").equals(pid).toArray();
    expect(list.length).toBe(1);
  });

  it("非换药日不创建", async () => {
    const today = todayStr();
    const pid = await addPatient({
      bedNumber: "309W03",
      name: "王五",
      diagnosis: "术后",
      surgeryDate: shiftDays(today, -3), // POD3 非换药日
    });
    const settings = {
      ...defaultSettings(),
      dressingSchedule: DEFAULT_SCHEDULE,
    } as Settings;
    await ensureTodaysDressingTodos(
      await db.patients.toArray(),
      settings,
      [],
      today
    );
    const list = await db.todos.where("patientId").equals(pid).toArray();
    expect(list.length).toBe(0);
  });

  it("手术日在未来（术前，POD 为负）不创建换药待办", async () => {
    const today = todayStr();
    const pid = await addPatient({
      bedNumber: "309W04",
      name: "赵六",
      diagnosis: "术前",
      surgeryDate: shiftDays(today, 3), // 未来手术日 → POD 为负
    });
    const settings = {
      ...defaultSettings(),
      dressingSchedule: DEFAULT_SCHEDULE,
    } as Settings;
    await ensureTodaysDressingTodos(
      await db.patients.toArray(),
      settings,
      [],
      today
    );
    const list = await db.todos.where("patientId").equals(pid).toArray();
    expect(list.length).toBe(0);
  });

  it("术后超过 maxDay 不创建换药待办", async () => {
    const today = todayStr();
    const pid = await addPatient({
      bedNumber: "309W05",
      name: "钱七",
      diagnosis: "术后",
      surgeryDate: shiftDays(today, -20), // POD20 > maxDay(14)
    });
    const settings = {
      ...defaultSettings(),
      dressingSchedule: DEFAULT_SCHEDULE,
    } as Settings;
    await ensureTodaysDressingTodos(
      await db.patients.toArray(),
      settings,
      [],
      today
    );
    const list = await db.todos.where("patientId").equals(pid).toArray();
    expect(list.length).toBe(0);
  });
});
