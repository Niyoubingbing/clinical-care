import { describe, it, expect } from "vitest";
import { filterHomeRows, type HomeRow } from "@/lib/home-filter";
import type { Patient, PatientStatus } from "@/types";

// 用真实床号驱动 parseBed，使 bedType 由解析自动判定（与首页运行时一致）：
//   - 匹配默认模板 → "real"（病房床）或 "extra-real"（带特殊标记的真实加床）
//   - 不匹配任何模板 → "virtual"（虚拟床）
// 床型不再由 Patient.bedType 手动字段决定。
function mk(id: string, bedNumber: string, group?: string): Patient {
  return {
    id,
    bedNumber,
    name: "N" + id,
    diagnosis: "D" + id,
    group,
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
  const items = patients.map((patient) => ({
    patient,
    todoCount: 0,
    status: STATUS,
  }));
  return { type: "group", id, items };
}

const ids = (rows: HomeRow[]): string[] =>
  rows.map((r) => (r.type === "single" ? r.patient.id : r.id));

describe("filterHomeRows - 虚拟床隐藏（床型自动判定）", () => {
  it("showVirtualBeds=false 剔除虚拟床单卡，真实床/加床保留且顺序不变", () => {
    const rows: HomeRow[] = [
      single(mk("real1", "309W01")),
      single(mk("virt1", "V09")),
      single(mk("extra1", "309WJ04")),
      single(mk("real2", "309W02")),
    ];
    const out = filterHomeRows(rows, null, false);
    expect(ids(out)).toEqual(["real1", "extra1", "real2"]);
  });

  it("showVirtualBeds=false 时只要组内任一 item 为虚拟床即整组剔除", () => {
    const rows: HomeRow[] = [
      group("g1", [mk("a", "309W01"), mk("b", "V09")]),
      single(mk("realX", "309W03")),
      group("g2", [mk("c", "309W04"), mk("d", "309WJ05")]),
    ];
    const out = filterHomeRows(rows, null, false);
    // g1 含虚拟床 -> 整组剔除；realX 保留；g2 全真实/加床 -> 保留
    expect(ids(out)).toEqual(["realX", "g2"]);
  });

  it("showVirtualBeds=true 时虚拟床单卡与整组均保留", () => {
    const rows: HomeRow[] = [
      single(mk("virt1", "V09")),
      group("g1", [mk("x", "V10"), mk("y", "309W01")]),
      single(mk("realZ", "309W06")),
    ];
    const out = filterHomeRows(rows, null, true);
    expect(ids(out)).toEqual(["virt1", "g1", "realZ"]);
  });

  it("过滤不改变真实床/加床的相对排序", () => {
    const rows: HomeRow[] = [
      single(mk("v1", "V09")),
      single(mk("r1", "309W07")),
      single(mk("e1", "309WJ06")),
      single(mk("r2", "309W08")),
      single(mk("v2", "V10")),
    ];
    const out = filterHomeRows(rows, null, false);
    // 仅剔除虚拟床，其余相对顺序应与原序列一致
    expect(ids(out)).toEqual(["r1", "e1", "r2"]);
  });
});

describe("filterHomeRows - 分组筛选与虚拟床隐藏共存", () => {
  const rows: HomeRow[] = [
    single(mk("realA", "309W09", "G1")),
    single(mk("virtA", "V11", "G2")),
    group("gG2", [mk("realB", "309W10", "G2"), mk("virtB", "V12", "G2")]),
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

describe("filterHomeRows - 尊重传入的床号模板设置", () => {
  it("默认模板下不匹配的床号归为虚拟床并被隐藏", () => {
    const rows: HomeRow[] = [single(mk("x", "ABC1"))];
    // 默认模板不匹配 "ABC1" → virtual → 关闭虚拟床时被剔除
    expect(ids(filterHomeRows(rows, null, false))).toEqual([]);
  });

  it("自定义 bedTemplate 匹配后该床号被视为真实床而显示", () => {
    const rows: HomeRow[] = [single(mk("x", "W30901"))];
    const out = filterHomeRows(rows, null, false, {
      // 4 个捕获组（ward / wardDir / special? / bedBase），且第 2 组必须非可选，
      // 否则 parseBed 访问 m[2].toUpperCase() 时会抛错（见 lib/bed-parser.ts:90）。
      // 字母前缀的自定义模板可命中默认模板无法识别的床号（默认模板以 3 位数字开头）。
      bedTemplate: "^([A-Z])(\\d{3})([A-Z]{0,2})?(\\d{2})$",
      specialMarks: [],
    });
    // 匹配自定义模板 → real → 即使关闭虚拟床也显示
    expect(ids(out)).toEqual(["x"]);
  });
});
