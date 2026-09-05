import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function importPatients(page: Page) {
  await page.getByRole("button", { name: "添加病人", exact: true }).click();
  await page.getByRole("button", { name: "批量导入", exact: true }).click();
  await page.getByPlaceholder(/309W23/).fill("309W01 普通测试 诊断\n309wj4 加床测试 诊断\n临时-A 未知测试 诊断");
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await page.getByRole("button", { name: "确认导入", exact: true }).click();
  await expect(page.getByRole("button", { name: "查看 加床测试 详情" })).toBeVisible();
}

test("床型独立于顺序，单床位置保存、刷新和窄屏显示", async ({ page, context }, testInfo) => {
  await context.route("**/sw.js", r => r.fulfill({ status: 404, body: "" }));
  await page.goto("/"); await importPatients(page);
  await page.getByRole("button", { name: "显示虚拟床", exact: true }).click();
  await expect(page.getByRole("button", { name: "查看 未知测试 详情" })).toBeVisible();
  await page.goto("/settings/bed-recognition");
  const unknown = page.locator(".card").filter({ has: page.getByText("临时-A · 未知测试", { exact: true }) });
  await expect(unknown).toContainText("待确认");
  await unknown.getByLabel("临时-A 床位类型").selectOption("virtual");
  await expect(unknown.locator(".badge-virtual")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  expect((await new AxeBuilder({ page }).include(".badge-virtual").withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await page.goto("/settings/rounding?bed=309WJ4");
  await expect(page.getByLabel("要调整的床位")).toHaveValue("309WJ4");
  await page.getByLabel("放置位置").selectOption("");
  await page.getByRole("button", { name: "保存此床位置" }).click();
  await expect(page.getByText("已保存", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("rounding-block").first()).toContainText("309WJ4");
  await page.setViewportSize({ width: 320, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("bed-placement-mobile.png"), fullPage: true });
  await page.goto("/");
  await expect(page.getByRole("button", { name: /^查看 .* 详情$/ }).first()).toHaveAttribute("aria-label", "查看 加床测试 详情");
  await expect(page.getByRole("button", { name: "查看 未知测试 详情" })).toHaveCount(0);
});

test("首次预缓存后离线导入、未访问详情、设置调整、刷新和更新错误反馈", async ({ page, context }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await importPatients(page);
  // Fresh soft navigation must use /patient.txt from precache, including a new _rsc query.
  await page.getByRole("button", { name: "查看 加床测试 详情" }).click();
  await expect(page.getByRole("heading", { name: "加床测试" })).toBeVisible();
  await page.getByRole("button", { name: "添加待办", exact: true }).click();
  await page.getByPlaceholder(/如：/).fill("离线随访测试");
  await page.getByRole("button", { name: "确定", exact: true }).click();
  await expect(page.getByPlaceholder(/如：/)).toHaveCount(0);
  await expect(page.getByText("离线随访测试", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("离线随访测试", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "设置", exact: true }).click();
  await page.getByRole("link", { name: /床号识别/ }).click();
  await expect(page.getByRole("heading", { name: "床号识别", exact: true })).toBeVisible();
  await page.getByLabel("临时-A 床位类型").selectOption("real");
  await page.reload();
  await expect(page.getByLabel("临时-A 床位类型")).toHaveValue("real");
  const payload = await page.evaluate(async () => {
    const response = await fetch("/settings/rounding.txt?_rsc=offline-new-key", { headers: { RSC: "1" } });
    return { ok: response.ok, text: await response.text() };
  });
  expect(payload.ok).toBe(true); expect(payload.text).not.toContain("<!DOCTYPE html>");
  await page.getByRole("link", { name: "设置", exact: true }).click();
  await page.getByRole("button", { name: "检查更新", exact: true }).click();
  await expect(page.getByText("检查更新失败，请重试")).toBeVisible();
  await expect(page.getByText("已是最新版本")).toHaveCount(0);
  expect(errors).toEqual([]);
  await context.setOffline(false);
});
