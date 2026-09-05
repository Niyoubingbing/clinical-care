import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ context }) => { await context.route("**/sw.js", r => r.fulfill({ status: 404, body: "" })); });
async function seed(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "添加病人", exact: true }).click();
  await page.getByRole("button", { name: "批量导入", exact: true }).click();
  await page.getByPlaceholder(/309W23/).fill("309W01 普通甲 测试诊断\n309W02 普通乙 测试诊断\n309WJ04 加床甲 测试诊断\n310W01 跨区甲 测试诊断");
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await page.getByRole("button", { name: "确认导入", exact: true }).click();
  await expect(page.getByRole("button", { name: "查看 普通甲 详情" })).toBeVisible();
}
async function basic(page: Page) {
  await page.goto("/settings/rounding");
  await page.getByRole("button", { name: "基础规则", exact: true }).click();
  await page.getByLabel("普通病床数量").fill("4");
  await page.getByLabel("平均单一病房床数").fill("2");
  await page.getByRole("button", { name: "生成病房块", exact: true }).click();
  await page.getByRole("button", { name: "确认替换", exact: true }).click();
  await expect(page.getByRole("button", { name: "确认替换", exact: true })).toHaveCount(0);
  await expect(page.getByTestId("rounding-block")).toHaveCount(2);
  await expect(page.getByText("已保存", { exact: true })).toBeVisible();
}
for (const bed of ["J04", "309WJ04"]) {
  test(`基础规则加床 ${bed} 可调整顺序、刷新保留且不误隐藏普通床`, async ({ page }) => {
    await seed(page); await basic(page);
    await page.getByRole("button", { name: "添加真实加床块" }).click();
    const extra = page.getByTestId("rounding-block").last();
    await extra.getByPlaceholder("如 J04 或 309WJ04").fill(bed);
    await extra.getByRole("button", { name: "添加", exact: true }).click();
    await page.getByRole("button", { name: "上移第 3 块" }).click();
    await page.getByRole("button", { name: "上移第 2 块" }).click();
    await expect(page.getByText("已保存", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("rounding-block").first()).toContainText(bed);
    await page.goto("/");
    await page.getByRole("button", { name: "显示虚拟床", exact: true }).click();
    await expect(page.getByRole("button", { name: /^查看 .* 详情$/ })).toHaveCount(4);
    await expect(page.getByRole("button", { name: /^查看 .* 详情$/ }).first()).toHaveAttribute("aria-label", "查看 加床甲 详情");
    await page.getByRole("button", { name: "查房排序：正序，点击切换为反序" }).click();
    await expect(page.getByRole("button", { name: /^查看 .* 详情$/ }).last()).toHaveAttribute("aria-label", "查看 加床甲 详情");
  });
}
test("房内前移、完整床号添加、重复保护和切换基础规则不丢加床", async ({ page }) => {
  await seed(page); await basic(page);
  const first = page.getByTestId("rounding-block").first();
  await first.getByRole("button", { name: "前移 02", exact: true }).click();
  await first.getByPlaceholder("添加床号，如 44").fill("309WJ04");
  await first.getByRole("button", { name: "添加", exact: true }).click();
  await expect(first.getByRole("button", { name: "删除 309WJ04", exact: true })).toBeVisible();
  await first.getByPlaceholder("添加床号，如 44").fill("309WJ04");
  await first.getByRole("button", { name: "添加", exact: true }).click();
  await expect(first.getByRole("button", { name: "删除 309WJ04", exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "基础规则", exact: true }).click();
  await expect(first).toContainText("309WJ04");
  await expect(page.getByText("已保存", { exact: true })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("button", { name: /^查看 .* 详情$/ }).first()).toHaveAttribute("aria-label", "查看 普通乙 详情");
});
test("床号识别页显示基础归属并独立修正类型", async ({ page }) => {
  await seed(page); await basic(page);
  await page.goto("/settings/bed-recognition");
  const row = page.locator(".card").filter({ has: page.getByText("309W01 · 普通甲", { exact: true }) });
  await expect(row).toContainText("所属：01 – 02");
  await row.getByLabel("309W01 床位类型").selectOption("virtual");
  await expect(row.locator(".badge-virtual")).toHaveText("虚拟床");
  await row.getByLabel("309W01 床位类型").selectOption("extra-real");
  await expect(row.locator(".badge-special")).toHaveText("加床");
  await page.reload(); await expect(row).toContainText("所属：01 – 02");
  await expect(row.getByLabel("309W01 床位类型")).toHaveValue("extra-real");
});
test("拖动块后顺序实际保存，恢复操作可以取消", async ({ page }) => {
  await basic(page);
  const blocks = page.getByTestId("rounding-block");
  const dragHandle = blocks.last().getByRole("button", { name: "拖拽排序" });
  await dragHandle.scrollIntoViewIfNeeded();
  await dragHandle.hover();
  const handle = await dragHandle.boundingBox();
  const target = await blocks.first().boundingBox();
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle!.x + handle!.width / 2, target!.y + 5, { steps: 25 });
  await page.mouse.up();
  await expect(blocks.first()).toContainText("03");
  await expect(page.getByText("已保存", { exact: true })).toBeVisible();
  await page.reload(); await expect(blocks.first()).toContainText("03");
  await page.getByRole("button", { name: "恢复", exact: true }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(blocks).toHaveCount(2); await expect(blocks.first()).toContainText("03");
});
