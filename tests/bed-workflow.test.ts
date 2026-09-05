import { beforeEach, describe, expect, it } from "vitest";
import { parseBed } from "@/lib/bed-parser";
import { recognizeBed } from "@/lib/bed-identity";
import { bedKey } from "@/lib/bed-number";
import { setBedTypeOverride } from "@/lib/bed-settings";
import { db, defaultSettings, getSettings, ensureSettingsMigrated, addPatient, addTodo } from "@/lib/db";
import { resolveOrder } from "@/lib/rounding";
import { basicRuleFromCounts, placeBedAfter } from "@/lib/rounding-edit";
import { analyzeRoster, applyRoster } from "@/lib/batch-import";
import { ensureTodaysDressingTodos, dressingDays } from "@/lib/dressing";
import { importClinicalData, parseClinicalJSON } from "@/lib/export-import";
import { filterHomeRows, type HomeRow } from "@/lib/home-filter";
import type { Patient, RoundingConfig } from "@/types";

const p = (bedNumber: string, id = bedNumber): Patient => ({ id, bedNumber, name: id, diagnosis: "测试", createdAt: 1, updatedAt: 1 });
beforeEach(async () => { await db.patients.clear(); await db.todos.clear(); await db.settings.put(defaultSettings()); });

describe("independent bed identity and route", () => {
  it.each(["309WJ4", "309wj04", "３０９ＷＪ０４", " J04 "])("recognizes %s as an extra bed without a route", bed => {
    const settings = { ...defaultSettings(), roundingOrder: { ruleType: "custom" as const, blocks: [] } };
    expect(recognizeBed(p(bed), settings)).toBe("extra-real");
    expect(parseBed(bed).bedBase).toBe(4);
  });
  it("unknown beds stay visible even when virtual beds are hidden", () => {
    const settings = defaultSettings();
    const rows = ["临时-A", "309W99"].map(bed => ({ type: "single", patient: p(bed), status: {}, todoCount: 0 })) as HomeRow[];
    expect(recognizeBed(p("临时-A"), settings)).toBe("unrecognized");
    expect(filterHomeRows(rows, null, false, settings)).toHaveLength(2);
  });
  it("manual type wins, persists by bed across patients, and can return to automatic", async () => {
    await Promise.all([setBedTypeOverride("309wj4", "virtual"), setBedTypeOverride("临时-A", "real")]);
    expect(recognizeBed(p("309WJ04", "replacement"), await getSettings())).toBe("virtual");
    expect(recognizeBed(p("临时-A"), await getSettings())).toBe("real");
    await setBedTypeOverride("309WJ04", null);
    expect(recognizeBed(p("309WJ04"), await getSettings())).toBe("extra-real");
  });
  it("preserves an old custom-name layout, virtual override and route during migration", async () => {
    const old = { ...defaultSettings(), bedRecognitionVersion: undefined, roundingOrder: { ruleType: "custom" as const, blocks: [{ id: "custom", kind: "extra" as const, beds: ["走廊-A"] }] }, virtualOverrides: ["临时-B"], theme: "system" as const };
    await db.settings.put(old); await db.patients.add(p("走廊-A"));
    await ensureSettingsMigrated(); const first = await getSettings(); await ensureSettingsMigrated();
    expect(await getSettings()).toEqual(first);
    expect(first.roundingOrder).toEqual(old.roundingOrder);
    expect(recognizeBed(p("走廊-A"), first)).toBe("extra-real");
    expect(recognizeBed(p("临时-B"), first)).toBe("virtual");
    expect(await db.patients.count()).toBe(1); expect(first.theme).toBe("system");
  });
  it("single-bed position wins over a generic J04 rule and survives replacement", () => {
    const base: RoundingConfig = { ruleType: "basic", blocks: [...basicRuleFromCounts(4, 2), { id: "j", kind: "extra", beds: ["J04"] }] };
    const next = placeBedAfter(base, "309wj4", base.blocks[0].id, "extra");
    const patients = ["309W01", "309W03", "309WJ04", "310W01", "310WJ04"].map(bed => p(bed));
    const ordered = resolveOrder(next, patients);
    expect(ordered.map(row => row.patient.bedNumber)).toEqual(["309W01", "309WJ04", "309W03", "310W01", "310WJ04"]);
    expect(new Set(ordered.map(row => row.patient.id)).size).toBe(5);
    expect(resolveOrder(next, [p("309WJ04", "new")])[0].groupId).toBe(ordered[1].groupId);
    expect(base.blocks).toHaveLength(3);
  });
  it("route placement never reclassifies a recognized bed", () => {
    const settings = defaultSettings();
    settings.roundingOrder = placeBedAfter(settings.roundingOrder, "309WJ04", "", "room");
    expect(recognizeBed(p("309WJ04"), settings)).toBe("extra-real");
    expect(bedKey("３１０ＷＪ０４")).not.toBe(bedKey("309WJ4"));
    expect(bedKey("309WJ4")).not.toBe(bedKey("309WYZ4"));
  });
  it("parses named groups and preserves child-bed distinction", () => {
    expect(parseBed("A-J4", "^(?<ward>A)-(?<mark>J)(?<bed>\\d+)$").ward).toBe("A");
    expect(parseBed("309W01-2").bedBase).toBe(1);
    expect(bedKey("309W01-2")).not.toBe(bedKey("309W01"));
  });
});

describe("data safety regressions", () => {
  it("invalid or empty replacement rosters do not delete patients", async () => {
    const patient = p("309W01"); await db.patients.add(patient);
    for (const text of ["", "bad line", "309W02 新人 诊断\n坏行"]) {
      const preview = analyzeRoster(text, [patient], true);
      expect(preview.toRemove).toHaveLength(0);
      await expect(applyRoster(preview)).rejects.toThrow();
    }
    expect(await db.patients.count()).toBe(1);
  });
  it("repeated submissions cannot duplicate a new patient and keep first-group default", async () => {
    const preview = analyzeRoster("309wj4 测试新人 诊断", [], false);
    const results = await Promise.allSettled([applyRoster(preview), applyRoster(preview)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const patient = (await db.patients.toArray())[0];
    expect(patient.group).toBe("解组"); expect(patient.bedType).toBe("extra-real");
  });
  it("unrelated same-day todos cannot suppress dressing; concurrent runs stay idempotent", async () => {
    const id = await addPatient({ bedNumber: "309W01", name: "测试", diagnosis: "测试", surgeryDate: "2026-09-04" });
    await addTodo({ patientId: id, type: "查血", content: "查血", dueDate: "2026-09-06" });
    const patients = await db.patients.toArray(), todos = await db.todos.toArray();
    await Promise.all([1, 2, 3].map(() => ensureTodaysDressingTodos(patients, defaultSettings(), todos, "2026-09-06")));
    expect((await db.todos.toArray()).filter(t => t.type === "换药")).toHaveLength(1);
    expect(dressingDays({ earlyInterval: 0, laterInterval: 1, maxDay: Infinity })).toEqual([]);
  });
  it("malformed optional fields and orphaned todos cannot replace the database", async () => {
    await db.patients.add(p("309W01"));
    await expect(importClinicalData({ patients: [{ ...p("309W02"), group: 123 } as unknown as Patient], todos: [] })).rejects.toThrow();
    await expect(importClinicalData({ patients: [], todos: [{ id: "x", patientId: "missing", content: "test", status: "pending", createdAt: 1 }] })).rejects.toThrow();
    expect(() => parseClinicalJSON('{"patients":{},"todos":[{}]}')).toThrow();
    expect(await db.patients.count()).toBe(1);
  });
});
