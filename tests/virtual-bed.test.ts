import { describe, it, expect } from "vitest";
import {
  filterHomeRows,
  type HomeRow,
  type HomeGroupItem,
} from "@/lib/home-filter";
import type { Patient, PatientStatus } from "@/types";

function mk(
  id: string,
  bedType?: Patient["bedType"],
  group?: string
): Patient {
  return {
    id,
    bedNumber: "309W" + id,
    name: "N" + id,
    diagnosis: "D" + id,
    group,
    bedType,
    createdAt: 1,
    updatedAt: 1,
  };
}

// 一个中性 PatientStatus（无提醒/无术后天数），仅用于占位。
const STATUS: PatientStatus = {
  needDressing: false,
  needBlood: false,
  todayDue: false,
  overdue: false,
  postOpDay: null,
  dressingToday: false,
  nextDressingInDays: null,
};

function single(p: Patient): HomeRow {
  return { type: "single", patient: p, todoCount: 0, status: STATUS };
}

function group(id: string, patients: Patient[]): HomeRow {
  const items: HomeGroupItem[] = patients.map((patient) => ({
    patient,
    todoCount: 0,
    status: STATUS,
  }));
  return { type: "group", id, items };
}

const ids = (rows: HomeRow[]): string[] =>
  rows.map((r) => (r.type === "single" ? r.patient.id : r.id));

describe("filterHomeRows - 虚拟床隐藏（Bug A 修复验证）", () => {
  it("showVirtualBeds=false 剔除虚拟床单卡，真实床/加床保留且顺序不变", () => {
    const rows: HomeRow[] = [
      single(mk("real1", "real")),
      single(mk("virt1", "virtual")),
      single(mk("extra1", "extra-real")),
      single(mk("real2", "real")),
    ];
    const out = filterHomeRows(rows, null, false);
    expect(ids(out)).toEqual(["real1", "extra1", "real2"]);
  });

  it("showVirtualBeds=false 时只要组内任一 item 为虚拟床即整组剔除", () => {
    const rows: HomeRow[] = [
      group("g1", [mk("a", "real"), mk("b", "virtual")]),
      single(mk("realX", "real")),
      group("g2", [mk("c", "real"), mk("d", "extra-real")]),
    ];
    const out = filterHomeRows(rows, null, false);
    // g1 含虚拟床 -> 整组剔除；realX 保留；g2 全真实/加床 -> 保留
    expect(ids(out)).toEqual(["realX", "g2"]);
  });

  it("showVirtualBeds=true 时虚拟床单卡与整组均保留", () => {
    const rows: HomeRow[] = [
      single(mk("virt1", "virtual")),
      group("g1", [mk("x", "virtual"), mk("y", "real")]),
      single(mk("realZ", "real")),
    ];
    const out = filterHomeRows(rows, null, true);
    expect(ids(out)).toEqual(["virt1", "g1", "realZ"]);
  });

  it("过滤不改变真实床/加床的相对排序", () => {
    const rows: HomeRow[] = [
      single(mk("v1", "virtual")),
      single(mk("r1", "real")),
      single(mk("e1", "extra-real")),
      single(mk("r2", "real")),
      single(mk("v2", "virtual")),
    ];
    const out = filterHomeRows(rows, null, false);
    // 仅剔除虚拟床，其余相对顺序应与原序列一致
    expect(ids(out)).toEqual(["r1", "e1", "r2"]);
  });
});

describe("filterHomeRows - 分组筛选与虚拟床隐藏共存", () => {
  const rows: HomeRow[] = [
    single(mk("realA", "real", "G1")),
    single(mk("virtA", "virtual", "G2")),
    group("gG2", [mk("realB", "real", "G2"), mk("virtB", "virtual", "G2")]),
  ];

  it("隐藏虚拟床 + 看 G2 -> 虚拟单卡与含虚拟床整组均剔除，结果为空", () => {
    expect(ids(filterHomeRows(rows, "G2", false))).toEqual([]);
  });

  it("隐藏虚拟床 + 看 G1 -> 只剩 G1 真实床单卡", () => {
    expect(ids(filterHomeRows(rows, "G1", false))).toEqual(["realA"]);
  });

  it("显示虚拟床 + 看 G2 -> 保留 G2 虚拟单卡与含虚拟床整组", () => {
    expect(ids(filterHomeRows(rows, "G2", true))).toEqual(["virtA", "gG2"]);
  });
});
