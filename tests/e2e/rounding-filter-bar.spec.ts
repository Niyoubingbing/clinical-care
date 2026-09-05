import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("紧凑筛选条：窄屏两行、宽屏一行，分组与显示状态可操作", async ({ page, context }, testInfo) => {
  await context.route("**/sw.js", r => r.fulfill({ status: 404, body: "" }));
  await page.goto("/");
  const bar = page.getByRole("region", { name: "查房筛选与显示" });
  await expect(bar.getByRole("button", { name: "显示虚拟床" })).toBeEnabled();
  await bar.getByRole("button", { name: "解组", exact: true }).click();
  await expect(bar.getByRole("button", { name: "解组", exact: true })).toHaveAttribute("aria-pressed", "true");
  await bar.getByRole("button", { name: "全部", exact: true }).click();
  await bar.getByRole("button", { name: "显示虚拟床" }).click();
  await expect(bar.getByRole("button", { name: "显示虚拟床" })).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(bar.getByRole("button", { name: "显示虚拟床" })).toHaveAttribute("aria-pressed", "false");
  for (const width of [320, 390, 900]) {
    await page.setViewportSize({ width, height: 844 });
    const box = await bar.boundingBox();
    expect(box!.height).toBeLessThanOrEqual(width < 581 ? 100 : 55);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await bar.screenshot({ path: testInfo.outputPath(`filter-bar-${width}.png`) });
  }
  const results = await new AxeBuilder({ page }).include(".rounding-filters").withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
});
