import { describe, expect, it } from "vitest";
import { importConfigText } from "@/lib/rounding-edit";

describe("importConfigText", () => {
  it("normalizes a valid imported config", () => {
    const result = importConfigText(JSON.stringify({
      ruleType: "custom",
      blocks: [{ id: "room-1", kind: "room", ward: "309W", beds: ["309W03", "309W01"] }],
    }));

    expect(result?.blocks[0]).toEqual({
      id: "room-1",
      kind: "room",
      ward: "309W",
      beds: ["309W01", "309W03"],
    });
  });

  it.each([
    { blocks: [null] },
    { blocks: [{ kind: "room", beds: "309W01" }] },
    { blocks: [{ kind: "room", beds: ["309W01", 2] }] },
    { blocks: [{ kind: "unknown", beds: [] }] },
  ])("rejects malformed blocks without throwing: %j", (value) => {
    expect(() => importConfigText(JSON.stringify(value))).not.toThrow();
    expect(importConfigText(JSON.stringify(value))).toBeNull();
  });
});
