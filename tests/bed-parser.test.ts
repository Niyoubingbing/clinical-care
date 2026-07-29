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
      // 不匹配任何床号模板 → 虚拟床（关键修复：不再兜底成 "real"）。
      expect(r.bedType).toBe("virtual");
    }
  });

  it("classifies unmatched bed numbers as virtual (auto bed-type detection)", () => {
    // 走廊床 / 临时床等不匹配模板的床号，应自动归为虚拟床。
    for (const b of ["V09", "L03", "走廊5", "临时床A"]) {
      const r = parseBed(b);
      expect(r.matched).toBe(false);
      expect(r.bedType).toBe("virtual");
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
    expect(r.bedType).toBe("virtual");
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

  it("treats a successful match under a non-4-group custom template as a real bed", () => {
    // 回归：自定义模板捕获组数≠4（此处 3 组 ^([A-Z])(\d{3})(\d{2})$）时，
    // 合法床号 "W30901" 仍应判定为真实床（real），而非因 m.length=4 < 5 误入兜底返回 virtual。
    const r = parseBed("W30901", "^([A-Z])(\\d{3})(\\d{2})$");
    expect(r.matched).toBe(true);
    expect(r.bedType).toBe("real");
    // 组数无关提取：ward 由 m[1]+m[2] 拼出（W + 309 → "W309"），不依赖固定 4 组结构。
    expect(r.ward).toBe("W309");
    // 该 3 组模板没有第 4 个「床基」捕获组，bedBase 由 trailingDigits 兜底推断为 30901（不会是 NaN）。
    expect(r.bedBase).toBe(30901);
  });
});
