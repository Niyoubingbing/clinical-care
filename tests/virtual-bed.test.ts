import { describe, it, expect } from "vitest";
import { filterHomeRows, type HomeRow } from "@/lib/home-filter";
import type { Patient, RoundingConfig } from "@/types";
import type { PatientStatus } from "@/lib/reminders";
import { basicRuleFromCounts } from "@/lib/rounding-edit";

// v2.17.2 起：床型由「床号是否在 settings.roundingOrder 的 room/extra 块里」决定，
//   - 在 room 块 → "real"（病房床）
//   - 在 extra 块 → "extra-real"（真实加床）
//   - 都不在 → "virtual"（虚拟床）
// 床号解析模板（bedTemplate / specialMarks）不再参与判定，仅用于展示。
// 匹配口径与 lib/rounding 的 resolveOrder 一致：块存完整床号则精确匹配，否则按 bedBase 匹配。
function mk(
  id: string,
  bedNumber: string,
  group?: string,
  ward?: string,
  bedBase?: number
): Patient {
  return {
    id,
    bedNumber,
    name: "N" + id,
    diagnosis: "D" + id,
    group,
    ward,
    bedBase,
    createdAt: 1,
    updatedAt: 1,
  };
}

/** 测试用查房配置：病房块含 309W01–309W04 与 309W06–309W10，加床块含 309WJ04 / 309WJ05 / 309WJ06。 */
const ORDER: RoundingConfig = {
  ruleType: "custom",
  blocks: [
    { id: "r1", kind: "room", ward: "309W", beds: ["309W01", "309W02", "309W03", "309W04"] },
    { id: "e1", kind: "extra", beds: ["309WJ04", "309WJ05", "309WJ06"] },
    { id: "r2", kind: "room", ward: "309W", beds: ["309W06", "309W07", "309W08", "309W09", "309W10"] },
  ],
};

const SETTINGS = { roundingOrder: ORDER };

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

describe("filterHomeRows - 虚拟床隐藏（以查房顺序判定）", () => {
  it("showVirtualBeds=false 剔除虚拟床单卡，真实床/加床保留且顺序不变", () => {
    const rows: HomeRow[] = [
      single(mk("real1", "309W01")),
      single(mk("virt1", "V09")),
      single(mk("extra1", "309WJ04")),
      single(mk("real2", "309W02")),
    ];
    const out = filterHomeRows(rows, null, false, SETTINGS);
    expect(ids(out)).toEqual(["real1", "extra1", "real2"]);
  });

  it("床号符合模板但不在查房列表里，同样按虚拟床剔除", () => {
    const rows: HomeRow[] = [
      single(mk("inList", "309W03")),
      // 309W99 能被默认解析模板匹配，但不在任何块里 → 虚拟床
      single(mk("notInList", "309W99")),
    ];
    expect(ids(filterHomeRows(rows, null, false, SETTINGS))).toEqual(["inList"]);
  });

  it("整组部分虚拟时仅剔虚拟成员、保留整组真实卡（新语义）", () => {
    const rows: HomeRow[] = [
      group("g1", [mk("a", "309W01"), mk("b", "V09", undefined, undefined, undefined)]),
      single(mk("realX", "309W03")),
      group("g2", [mk("c", "309W04"), mk("d", "309WJ05")]),
    ];
    const out = filterHomeRows(rows, null, false, SETTINGS);
    expect(ids(out)).toEqual(["g1", "realX", "g2"]);
  });

  it("showVirtualBeds=true 时虚拟床单卡与整组均保留", () => {
    const rows: HomeRow[] = [
      single(mk("virt1", "V09")),
      group("g1", [mk("x", "V10"), mk("y", "309W01")]),
      single(mk("realZ", "309W06")),
    ];
    const out = filterHomeRows(rows, null, true, SETTINGS);
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
    const out = filterHomeRows(rows, null, false, SETTINGS);
    // 仅剔除虚拟床，其余相对顺序应与原序列一致
    expect(ids(out)).toEqual(["r1", "e1", "r2"]);
  });

  it("virtualOverrides 强制标虚拟的床，即使在块里也被隐藏", () => {
    const rows: HomeRow[] = [single(mk("r1", "309W01")), single(mk("r2", "309W02"))];
    const out = filterHomeRows(rows, null, false, {
      roundingOrder: ORDER,
      virtualOverrides: ["309W01"],
    });
    expect(ids(out)).toEqual(["r2"]);
  });
});

describe("filterHomeRows - 基础规则下仍正确隐藏 / 保留真实床", () => {
  const basic = basicRuleFromCounts(4, 2); // 块 [01,02] 与 [03,04]
  const basicSettings = { roundingOrder: basic };

  it("基础规则：按 bedBase 匹配，309W01/02/03 在隐藏虚拟床下全部保留", () => {
    const rows: HomeRow[] = [
      single(mk("a", "309W01", undefined, "309W", 1)),
      single(mk("b", "309W02", undefined, "309W", 2)),
      single(mk("c", "309W03", undefined, "309W", 3)),
    ];
    const out = filterHomeRows(rows, null, false, basicSettings);
    expect(ids(out)).toEqual(["a", "b", "c"]);
  });

  it("基础规则：纯虚拟床（bedBase 不在块里）仍被隐藏", () => {
    const rows: HomeRow[] = [single(mk("x", "309W99", undefined, "309W", 99))];
    expect(ids(filterHomeRows(rows, null, false, basicSettings))).toEqual([]);
  });
});

describe("filterHomeRows - 整组仅部分虚拟（virtualOverrides）时保留真实成员", () => {
  const mixedSettings = {
    roundingOrder: {
      ruleType: "custom" as const,
      blocks: [{ id: "r1", kind: "room", ward: "309W", beds: ["309W01", "309W02"] }],
    },
    virtualOverrides: ["309W02"],
  };

  it("同一整组含真实成员与强制虚拟成员：隐藏虚拟成员后保留整组真实卡", () => {
    const rows: HomeRow[] = [
      group("g1", [mk("real1", "309W01", undefined, "309W", 1), mk("virt1", "309W02", undefined, "309W", 2)]),
    ];
    const out = filterHomeRows(rows, null, false, mixedSettings);
    // g1 中 309W01 真实、309W02 被强制虚拟 → 整组保留 309W01（仅真实成员）
    expect(ids(out)).toEqual(["g1"]);
    if (out[0].type === "group") {
      expect(out[0].items.map((it) => it.patient.id)).toEqual(["real1"]);
    }
  });
});

describe("filterHomeRows - 分组筛选与虚拟床隐藏共存", () => {
  const rows: HomeRow[] = [
    single(mk("realA", "309W09", "G1")),
    single(mk("virtA", "V11", "G2")),
    group("gG2", [mk("realB", "309W10", "G2"), mk("virtB", "V12", "G2")]),
  ];

  it("隐藏虚拟床 + 看 G2 -> 虚拟单卡与含虚拟床整组均剔除，结果为空", () => {
    expect(ids(filterHomeRows(rows, "G2", false, SETTINGS))).toEqual(["gG2"]);
  });

  it("隐藏虚拟床 + 看 G1 -> 只剩 G1 真实床单卡", () => {
    expect(ids(filterHomeRows(rows, "G1", false, SETTINGS))).toEqual(["realA"]);
  });

  it("显示虚拟床 + 看 G2 -> 保留 G2 虚拟单卡与含虚拟床整组", () => {
    expect(ids(filterHomeRows(rows, "G2", true, SETTINGS))).toEqual([
      "virtA",
      "gG2",
    ]);
  });
});

describe("filterHomeRows - 设置缺失时的防御", () => {
  it("未传 settings（首帧未加载）时按无查房配置处理：全部视为虚拟床", () => {
    const rows: HomeRow[] = [single(mk("x", "309W01"))];
    expect(ids(filterHomeRows(rows, null, false))).toEqual([]);
    // 展示虚拟床时不受影响
    expect(ids(filterHomeRows(rows, null, true))).toEqual(["x"]);
  });

  it("roundingOrder.blocks 为空数组时不崩溃且全部按虚拟床处理", () => {
    const rows: HomeRow[] = [single(mk("x", "309W01"))];
    const empty: RoundingConfig = { ruleType: "custom", blocks: [] };
    expect(ids(filterHomeRows(rows, null, false, { roundingOrder: empty }))).toEqual(
      []
    );
  });
});
