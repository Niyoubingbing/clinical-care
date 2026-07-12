import { describe, it, expect, vi } from "vitest";

// 回归点 3：ensureSettingsMigrated() 将旧版 theme:"system" 一次性翻为 "light"；
// 已显式选过 dark 的用户不受迁移影响。
//
// 由于该迁移由模块级 flag (migrationDone) 保证只跑一次，
// 每个用例通过 vi.resetModules() + 动态 import 拿到全新的模块实例，
// 从而让 migrationDone 复位、相互隔离。

async function loadFreshDb() {
  vi.resetModules();
  return import("@/lib/db");
}

describe("ensureSettingsMigrated 主题迁移", () => {
  it('theme:"system" 迁移后变为 "light"', async () => {
    const mod = await loadFreshDb();
    await mod.db.settings.clear();
    await mod.db.settings.put({
      id: 1,
      theme: "system",
      roundingOrder: mod.defaultRoundingConfig(),
      listDirection: "forward",
      quickTodos: mod.defaultQuickTodos(),
      customGroups: mod.defaultCustomGroups(),
    } as never);

    await mod.ensureSettingsMigrated();
    const s = await mod.getSettings();
    expect(s.theme).toBe("light");
  });

  it('已显式 theme:"dark" 迁移后仍为 "dark"（不被翻成 light）', async () => {
    const mod = await loadFreshDb();
    await mod.db.settings.clear();
    await mod.db.settings.put({
      id: 1,
      theme: "dark",
      roundingOrder: mod.defaultRoundingConfig(),
      listDirection: "forward",
      quickTodos: mod.defaultQuickTodos(),
      customGroups: mod.defaultCustomGroups(),
    } as never);

    await mod.ensureSettingsMigrated();
    const s = await mod.getSettings();
    expect(s.theme).toBe("dark");
  });
});
