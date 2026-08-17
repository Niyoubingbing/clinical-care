import { describe, it, expect } from "vitest";
import { contrastTextColor } from "@/lib/contrast";

// 纯函数单测：contrastTextColor 依据背景亮度返回可读文字色。
// 浅色背景 -> #1a1a1a；深色背景 -> #ffffff；空/非法输入 -> #1a1a1a。
describe("contrastTextColor", () => {
  it("浅色背景返回深色文字 #1a1a1a", () => {
    expect(contrastTextColor("#fde68a")).toBe("#1a1a1a"); // 黄（浅）
    expect(contrastTextColor("#bfdbfe")).toBe("#1a1a1a"); // 蓝（浅）
    expect(contrastTextColor("#ffffff")).toBe("#1a1a1a"); // 纯白
  });

  it("深色背景返回浅色文字 #ffffff", () => {
    expect(contrastTextColor("#b5532f")).toBe("#ffffff"); // 砖红（深）
    expect(contrastTextColor("#141413")).toBe("#ffffff"); // 近黑（深）
    expect(contrastTextColor("#000000")).toBe("#ffffff"); // 纯黑
  });

  it("空/非法输入返回 #1a1a1a", () => {
    expect(contrastTextColor("")).toBe("#1a1a1a");
    expect(contrastTextColor(undefined)).toBe("#1a1a1a");
    expect(contrastTextColor(null as unknown as string)).toBe("#1a1a1a");
    expect(contrastTextColor("#ab")).toBe("#1a1a1a"); // 长度不足
    expect(contrastTextColor("not-a-color")).toBe("#1a1a1a"); // 长度不符
  });

  it("支持 3 位简写 hex", () => {
    expect(contrastTextColor("#fff")).toBe("#1a1a1a"); // 白底 -> 深字
    expect(contrastTextColor("#000")).toBe("#ffffff"); // 黑底 -> 浅字
  });
});
