import { describe, it, expect, beforeEach } from "vitest";
import {
  parseClinicalJSON,
  importClinicalData,
  type ParsedClinical,
} from "@/lib/export-import";
import { db } from "@/lib/db";
import type { Patient, Todo } from "@/types";

function mkPatient(id: string, extra: Partial<Patient> = {}): Patient {
  return {
    id,
    bedNumber: id + "-bed",
    name: "Name" + id,
    diagnosis: "Dx" + id,
    ward: "309W",
    bedBase: 1,
    bedType: "real",
    createdAt: 1,
    updatedAt: 1,
    ...extra,
  };
}
function mkTodo(id: string, extra: Partial<Todo> = {}): Todo {
  return {
    id,
    content: "Todo" + id,
    status: "pending",
    createdAt: 1,
    ...extra,
  };
}

describe("parseClinicalJSON", () => {
  it("parses a valid object with patients and todos", () => {
    const text = JSON.stringify({
      patients: [mkPatient("p1")],
      todos: [mkTodo("t1")],
    });
    const r = parseClinicalJSON(text);
    expect(r.patients).toHaveLength(1);
    expect(r.todos).toHaveLength(1);
  });

  it("throws on malformed JSON", () => {
    expect(() => parseClinicalJSON("{not json")).toThrow();
  });

  it("throws on non-object JSON (e.g. a number)", () => {
    expect(() => parseClinicalJSON("123")).toThrow("文件格式不正确");
  });

  it("throws when both patients and todos are empty", () => {
    expect(() =>
      parseClinicalJSON(JSON.stringify({ patients: [], todos: [] }))
    ).toThrow("文件中没有病人或待办数据");
  });

  it("accepts a patients-only payload", () => {
    const r = parseClinicalJSON(JSON.stringify({ patients: [mkPatient("p1")] }));
    expect(r.patients).toHaveLength(1);
    expect(r.todos).toHaveLength(0);
  });
});

describe("importClinicalData", () => {
  beforeEach(async () => {
    await db.patients.clear();
    await db.todos.clear();
  });

  it("clears and inserts valid data", async () => {
    const data: ParsedClinical = {
      patients: [mkPatient("p1")],
      todos: [mkTodo("t1")],
    };
    await importClinicalData(data);
    const ps = await db.patients.toArray();
    const ts = await db.todos.toArray();
    expect(ps).toHaveLength(1);
    expect(ts).toHaveLength(1);
  });

  it("rejects a malformed patient and does NOT wipe pre-existing data", async () => {
    // seed existing data first
    await db.patients.add(mkPatient("seed"));
    const before = await db.patients.toArray();
    expect(before).toHaveLength(1);

    const bad: ParsedClinical = {
      patients: [mkPatient("bad", { id: "" })],
      todos: [],
    };
    await expect(importClinicalData(bad)).rejects.toThrow(/缺少 id/);

    // data-safety red line: the original record must remain untouched
    const after = await db.patients.toArray();
    expect(after.map((p) => p.id)).toContain("seed");
  });

  it("rejects a todo with an illegal status", async () => {
    const bad: ParsedClinical = {
      patients: [mkPatient("p1")],
      todos: [{ ...mkTodo("t1"), status: "weird" } as Todo],
    };
    await expect(importClinicalData(bad)).rejects.toThrow(/状态非法/);
  });
});
