import { describe, it, expect } from "vitest";
import { resolveOrder } from "@/lib/rounding";
import type { Patient, RoundingConfig } from "@/types";

function mk(
  id: string,
  bedNumber: string,
  ward: string,
  bedBase: number
): Patient {
  return {
    id,
    bedNumber,
    name: "N" + id,
    diagnosis: "D" + id,
    ward,
    bedBase,
    bedType: "real",
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("resolveOrder", () => {
  it("appends all patients in ward+bedBase order when config has no blocks", () => {
    const cfg: RoundingConfig = { ruleType: "custom", blocks: [] };
    const patients = [
      mk("p3", "x", "309W", 3),
      mk("p1", "x", "309W", 1),
      mk("p2", "x", "120N", 2),
    ];
    const res = resolveOrder(cfg, patients);
    // sorted by ward asc (zh-locale: 120N before 309W) then bedBase asc:
    // p2(120N,2) -> p1(309W,1) -> p3(309W,3)
    expect(res.map((r) => r.patient.id)).toEqual(["p2", "p1", "p3"]);
    expect(res.every((r) => r.groupId === null)).toBe(true);
  });

  it("orders full-bed blocks by exact bedNumber and tags groupId", () => {
    const cfg: RoundingConfig = {
      ruleType: "default",
      blocks: [
        { id: "b1", kind: "room", ward: "309W", beds: ["309W01", "309W02"] },
        { id: "b2", kind: "extra", beds: ["309WJ04"] },
      ],
    };
    const patients = [
      mk("p2", "309W02", "309W", 2),
      mk("p1", "309W01", "309W", 1),
      mk("pJ", "309WJ04", "309W", 4),
      mk("p99", "999Z99", "999Z", 99), // not in any block -> appended
    ];
    const res = resolveOrder(cfg, patients);
    expect(res.map((r) => r.patient.id)).toEqual(["p1", "p2", "pJ", "p99"]);
    expect(res[0].groupId).toBe("b1");
    expect(res[1].groupId).toBe("b1");
    expect(res[2].groupId).toBe("b2");
    expect(res[3].groupId).toBeNull();
  });

  it("basic rule isolates wards and sorts them by zh-locale", () => {
    const cfg: RoundingConfig = {
      ruleType: "basic",
      blocks: [{ id: "br", kind: "room", beds: ["01", "02"] }],
    };
    const patients = [
      mk("a", "309W01", "309W", 1),
      mk("b", "309W02", "309W", 2),
      mk("c", "120N01", "120N", 1),
      mk("d", "120N02", "120N", 2),
    ];
    const res = resolveOrder(cfg, patients);
    // wards sorted ascending: 120N before 309W
    expect(res.map((r) => r.patient.id)).toEqual(["c", "d", "a", "b"]);
    expect(res[0].groupId).toBe("br#120N");
    expect(res[2].groupId).toBe("br#309W");
  });

  it("does not double-place a patient listed in two full-bed blocks", () => {
    const cfg: RoundingConfig = {
      ruleType: "default",
      blocks: [
        { id: "b1", kind: "room", beds: ["309W01"] },
        { id: "b2", kind: "room", beds: ["309W01"] },
      ],
    };
    const patients = [mk("p1", "309W01", "309W", 1)];
    const res = resolveOrder(cfg, patients);
    expect(res.filter((r) => r.patient.id === "p1")).toHaveLength(1);
  });

  it("keeps stable order for unmatched patients with equal ward+bedBase", () => {
    const cfg: RoundingConfig = { ruleType: "custom", blocks: [] };
    const patients = [
      mk("first", "x", "309W", 5),
      mk("second", "y", "309W", 5),
    ];
    const res = resolveOrder(cfg, patients);
    expect(res.map((r) => r.patient.id)).toEqual(["first", "second"]);
  });
});
