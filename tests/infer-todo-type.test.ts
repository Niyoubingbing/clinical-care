import { describe, it, expect } from "vitest";
import { inferTodoType } from "@/lib/time-parser";

// 聚焦单元测试：验证新建待办时由内容自动推断类型（inferTodoType）。
// 这是「简化新建待办表单」后唯一决定待办 type 的路径，
// 直接影响「换药 → lastDressingChange 联动」等临床规则是否仍生效。
describe("inferTodoType", () => {
  it('含"换药" → "换药"', () => {
    expect(inferTodoType("明天换药")).toBe("换药");
    expect(inferTodoType("下午换药一次")).toBe("换药");
  });

  it('含"开查血" → "开查血"，且优先级高于"查血"', () => {
    expect(inferTodoType("开查血化验单")).toBe("开查血");
  });

  it('仅含"查血"（无"开"前缀）→ "查血"', () => {
    expect(inferTodoType("复查血象看结果")).toBe("查血");
  });

  it('含"术前" → "开术前"', () => {
    expect(inferTodoType("明天术前准备")).toBe("开术前");
    expect(inferTodoType("术后复查不是术前安排")).toBe("开术前");
  });

  it('含"出院" → "出院"', () => {
    expect(inferTodoType("明天出院")).toBe("出院");
    expect(inferTodoType("预计周三维出院")).toBe("出院");
  });

  it('纯文本（无关键词）→ "其他"', () => {
    expect(inferTodoType("交班记录")).toBe("其他");
    expect(inferTodoType("写病历周会")).toBe("其他");
    expect(inferTodoType("")).toBe("其他");
  });

  it('"康复会诊" 优先级高于 "会诊"', () => {
    expect(inferTodoType("下周一康复会诊")).toBe("康复会诊");
  });

  it('含"会诊"（非康复会诊）→ "会诊"', () => {
    expect(inferTodoType("周三多学科会诊")).toBe("会诊");
  });

  it('含"复查" → "复查"', () => {
    expect(inferTodoType("周四复查X光")).toBe("复查");
  });
});
