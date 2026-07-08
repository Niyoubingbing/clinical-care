import { describe, it, expect } from "vitest";
import { dueLabel, parseTime } from "@/lib/time-parser";

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function offset(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return fmt(d);
}

describe("dueLabel", () => {
  it("returns none for undefined", () => {
    expect(dueLabel(undefined)).toEqual({
      text: "无日期",
      level: "none",
      days: null,
    });
  });

  it("returns none for empty string", () => {
    expect(dueLabel("")).toEqual({ text: "无日期", level: "none", days: null });
  });

  it("returns none for a malformed date", () => {
    const r = dueLabel("not-a-date");
    expect(r.level).toBe("none");
    expect(r.days).toBeNull();
  });

  it("marks overdue for a past date", () => {
    const r = dueLabel(offset(-3));
    expect(r.level).toBe("overdue");
    expect(r.days).toBe(-3);
    expect(r.text).toContain("已逾期");
  });

  it("marks today", () => {
    const r = dueLabel(offset(0));
    expect(r.level).toBe("today");
    expect(r.text).toBe("今天到期");
  });

  it("marks soon for tomorrow", () => {
    const r = dueLabel(offset(1));
    expect(r.level).toBe("soon");
    expect(r.text).toBe("明天到期");
  });

  it("marks soon for 2-3 days out", () => {
    const r = dueLabel(offset(3));
    expect(r.level).toBe("soon");
    expect(r.days).toBe(3);
  });

  it("marks future for a far date", () => {
    const r = dueLabel(offset(10));
    expect(r.level).toBe("future");
  });
});

describe("parseTime", () => {
  it("parses 明天 as a relative date", () => {
    const r = parseTime("明天换药");
    expect(r?.label).toBe("今明后天");
    expect(r?.date).toBe(offset(1));
  });

  it("parses 下周三 as a weekday", () => {
    const r = parseTime("下周三复查");
    expect(r?.label).toBe("星期几");
    expect(r?.date).toBeDefined();
  });

  it("parses an explicit date", () => {
    const r = parseTime("2025-01-15 复诊");
    expect(r?.label).toBe("具体日期");
    expect(r?.date).toBe("2025-01-15");
  });

  it("returns null for non-date text", () => {
    expect(parseTime("随便写写")).toBeNull();
  });

  it("returns null for empty text", () => {
    expect(parseTime("")).toBeNull();
  });
});
