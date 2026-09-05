import { describe, it, expect, vi } from "vitest";

// Explicit theme preferences survive idempotent settings migration.

async function loadFreshDb() {
  vi.resetModules();
  return import("@/lib/db");
}

describe("ensureSettingsMigrated 主题迁移", () => {
  it('theme:"system" 迁移后仍为 "system"', async () => {
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
    expect(s.theme).toBe("system");
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
