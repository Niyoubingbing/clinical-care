import { describe, it, expect } from "vitest";
import {
  parseBed,
  DEFAULT_BED_TEMPLATE,
  DEFAULT_SPECIAL_MARKS,
} from "@/lib/bed-parser";

describe("parseBed", () => {
  it("parses a normal ward-prefixed bed number", () => {
    const r = parseBed("309W01");
    expect(r.matched).toBe(true);
    expect(r.ward).toBe("309W");
    expect(r.bedBase).toBe(1);
    expect(r.specialType).toBe("");
    expect(r.bedType).toBe("real");
  });

  it("detects single-letter J special mark as extra-real", () => {
    const r = parseBed("309WJ04");
    expect(r.matched).toBe(true);
    expect(r.specialType).toBe("J");
    expect(r.bedType).toBe("extra-real");
    expect(r.bedBase).toBe(4);
    expect(r.ward).toBe("309W");
  });

  it("detects multi-letter YZ special mark", () => {
    const r = parseBed("309WYZ05");
    expect(r.matched).toBe(true);
    expect(r.specialType).toBe("YZ");
    expect(r.bedType).toBe("extra-real");
    expect(r.bedBase).toBe(5);
  });

  it("honors a custom specialMarks list", () => {
    const r = parseBed("309WX05", DEFAULT_BED_TEMPLATE, ["X"]);
    expect(r.specialType).toBe("X");
    expect(r.bedType).toBe("extra-real");
  });

  it("treats unlisted special letters as a normal real bed", () => {
    const r = parseBed("309WX05"); // default marks are ["J","YZ"]
    expect(r.specialType).toBe("X");
    expect(r.bedType).toBe("real");
  });

  it("returns a safe fallback (no throw) for beds that do not match the template", () => {
    for (const b of ["J04", "V09", "random", "30901", "ABC", "120"]) {
      const r = parseBed(b);
      expect(r.matched).toBe(false);
      expect(typeof r.bedBase).toBe("number");
      expect(r.bedType).toBe("real");
    }
  });

  it("does not throw on a malformed bedTemplate regex (degrades to fallback)", () => {
    for (const tmpl of ["(unclosed", ")", "[", "*", "???"]) {
      const r = parseBed("309W01", tmpl);
      expect(r.matched).toBe(false);
    }
  });

  it("handles an empty string gracefully", () => {
    const r = parseBed("");
    expect(r.matched).toBe(false);
    expect(r.bedBase).toBe(0);
    expect(r.bedType).toBe("real");
  });

  it("handles undefined bedNumber without throwing (graceful fallback)", () => {
    const r = parseBed(undefined as unknown as string);
    expect(r).toBeDefined();
    expect(r.matched).toBe(false);
  });

  it("infers ward from leading digits+letter when the base template fails", () => {
    // lowercase ward direction is not matched by the [A-Z] template group,
    // but the fallback still infers the ward prefix.
    const r = parseBed("309w01");
    expect(r.matched).toBe(false);
    expect(r.ward).toBe("309W");
  });
});
