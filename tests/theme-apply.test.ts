// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

// 告知 React 当前处于 act 测试环境，避免告警。
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// 回归点 4：Providers 的 applyThemeClass 依据 settings.theme 给 <html> 加/去
// `dark` 类并同步原生 color-scheme。这里 mock 掉 db 层，直接控制 settings.theme，
// 从而隔离测试主题应用逻辑、且避开 ensureSettingsMigrated 对 "system"->"light" 的干扰。
vi.mock("@/lib/db", () => ({
  getSettings: vi.fn(async () => ({ theme: "light" })),
  ensureSettingsMigrated: vi.fn(async () => {}),
}));

import { getSettings } from "@/lib/db";
import Providers from "@/components/Providers";

let root: Root | null = null;

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => {
  mockMatchMedia(false);
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "";
});

afterEach(() => {
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "";
});

async function renderWithTheme(theme: "light" | "dark" | "system") {
  (getSettings as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    theme,
    roundingOrder: undefined,
    quickTodos: [],
    customGroups: [],
    listDirection: "forward",
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(React.createElement(Providers, null, null));
  });
  // 等待 useLiveQuery(async getSettings) 解析并触发主题副作用
  await act(async () => {
    await new Promise((r) => setTimeout(r, 40));
  });
}

describe("Providers.applyThemeClass 主题应用", () => {
  it('theme:"dark" -> <html> 加 dark 类且 colorScheme="dark"', async () => {
    await renderWithTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it('theme:"light" -> <html> 去 dark 类且 colorScheme="light"', async () => {
    await renderWithTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it('theme:"system" 跟随 matchMedia（prefers dark）', async () => {
    mockMatchMedia(true);
    await renderWithTheme("system");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it('theme:"system" 跟随 matchMedia（prefers light）', async () => {
    mockMatchMedia(false);
    await renderWithTheme("system");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });
});
