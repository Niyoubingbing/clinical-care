import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ context }) => { await context.route("**/sw.js", route => route.fulfill({ status: 404, body: "" })); });

test("设置换药规则只有统一入口，确认保存、取消及刷新", async ({ page }, testInfo) => {
  await page.goto("/settings");
  const entry = page.getByRole("button", { name: "换药规则 管理病人的默认换药安排" });
  await expect(entry).toBeEnabled();
  await expect(page.getByRole("spinbutton")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("settings-restored.png"), fullPage: true });
  await entry.click();
  const dialog = page.getByRole("dialog", { name: "换药规则" });
  await expect(dialog).toBeVisible();
  await page.getByLabel("间隔天数", { exact: true }).fill("4");
  await dialog.getByRole("button", { name: "取消" }).click();
  await entry.click();
  await expect(page.getByLabel("间隔天数", { exact: true })).toHaveValue("3");
  await page.getByLabel("间隔天数", { exact: true }).fill("4");
  await dialog.getByRole("button", { name: "保存规则" }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(entry).toBeEnabled(); await entry.click();
  await expect(page.getByLabel("间隔天数", { exact: true })).toHaveValue("4");
  await expect(page.getByText("术后第 2 天起，每 4 天一次，至第 14 天。", { exact: true })).toBeVisible();
  const a11y = await new AxeBuilder({ page }).include(".dressing-rule-dialog").withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(a11y.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("dressing-rule-dialog.png"), fullPage: true });
  await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0);
});

test("添加病人和详情使用同一规则入口，单独规则可恢复默认", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加病人", exact: true }).click();
  const entry = page.getByRole("button", { name: "换药规则 使用默认规则" });
  await expect(entry).toBeEnabled();
  await expect(page.getByRole("spinbutton")).toHaveCount(0);
  await entry.click();
  await page.getByRole("radio", { name: "为此病人单独设置" }).check();
  await page.getByLabel("间隔天数", { exact: true }).fill("5");
  await page.getByRole("button", { name: "保存规则" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByPlaceholder("如 309W23").fill("309W23");
  await page.getByPlaceholder("姓名", { exact: true }).fill("规则测试病人");
  await page.getByPlaceholder("诊断", { exact: true }).fill("仅供测试");
  await page.locator(".liquid-sheet").getByRole("button", { name: "添加病人", exact: true }).click();
  await page.getByRole("button", { name: "查看 规则测试病人 详情" }).click();
  await expect(page.getByRole("heading", { name: "规则测试病人" })).toBeVisible();
  await expect(page.locator(".care-plan-card")).toHaveCount(0);
  await page.getByRole("button", { name: "换药规则 此病人使用单独规则" }).click();
  await expect(page.getByLabel("间隔天数", { exact: true })).toHaveValue("5");
  await page.getByRole("radio", { name: /使用默认规则/ }).check();
  await page.getByRole("button", { name: "保存规则" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "换药规则 此病人使用默认规则" })).toBeVisible();
});

test("关闭规则弹窗不关闭底层病人表单", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加病人", exact: true }).click();
  await page.getByRole("button", { name: "换药规则 使用默认规则" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByPlaceholder("姓名", { exact: true })).toBeVisible();
});
