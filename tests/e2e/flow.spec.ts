import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const SHOTS = path.join(process.cwd(), 'tests', 'e2e', 'screenshots');
mkdirSync(SHOTS, { recursive: true });

test.beforeEach(async ({ context }) => {
  await context.route('**/sw.js', (r) => r.fulfill({ status: 404, body: '' }));
});

test('核心流程1: 添加病人 → 列表出现卡片 → 进入详情', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: '添加病人' }).click();
  const patientSheet = page.locator('.liquid-sheet');
  await expect(patientSheet).toBeVisible();
  await expect(patientSheet).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.screenshot({ path: path.join(SHOTS, 'sheet-add-patient.png'), fullPage: true });
  await page.getByPlaceholder('如 309W23').fill('309W23');
  await page.getByPlaceholder('姓名').fill('测试病人甲');
  await page.getByPlaceholder('诊断').fill('急性阑尾炎');
  await page.getByRole('button', { name: '保存' }).click();

  const card = page.getByRole('button', { name: '查看 测试病人甲 详情' });
  await expect(card).toBeVisible();

  await card.click();
  await expect(page.getByRole('heading', { name: '测试病人甲' })).toBeVisible();
  await expect(page.getByText('309W23 · 急性阑尾炎')).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, 'flow-detail.png'), fullPage: true });
});

test('核心流程2: 通用待办 添加 → 自然语言时间识别 → 完成 → 删除', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: '通用待办' }).click();
  const todoSheet = page.locator('.liquid-sheet');
  await expect(todoSheet).toBeVisible();
  await expect(todoSheet).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.screenshot({ path: path.join(SHOTS, 'sheet-general-todo.png'), fullPage: true });
  const ta = page.getByPlaceholder('如：交班记录 / 写病历 / 周会');
  await ta.fill('明早查房');
  // 时间解析实时反馈（time-parser 已单测覆盖，这里验证 UI 串联）
  await expect(page.getByText(/识别到时间：/)).toBeVisible();
  await page.getByRole('button', { name: '确定' }).click();

  await page.getByRole('link', { name: '待办' }).click();
  await expect(page.getByText('明早查房')).toBeVisible();

  await page.getByRole('button', { name: '标记为完成' }).first().click();
  await page.getByRole('button', { name: '已完成' }).click();
  await expect(page.getByText('明早查房')).toBeVisible();

  await page.getByRole('button', { name: '删除' }).first().click();
  await expect(page.getByText('明早查房')).toHaveCount(0);
});

test('核心流程3: 批量导入多病人', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: '添加病人' }).click();
  await page.getByRole('button', { name: '批量导入' }).click();
  const ta = page.getByPlaceholder(/309W23/);
  await ta.fill('309W23 魏某 取除骨折内固定装置\n309W24 张某 胫骨骨折');

  await page.getByRole('button', { name: '预览' }).click();
  await expect(page.getByText(/新增 2 人/)).toBeVisible();

  await page.getByRole('button', { name: '确认导入' }).click();
  await expect(page.getByRole('button', { name: '查看 魏某 详情' })).toBeVisible();
  await expect(page.getByRole('button', { name: '查看 张某 详情' })).toBeVisible();
});

test('核心流程4: 首页列表正序/反序切换并持久化到 settings', async ({ page }) => {
  await page.goto('/');

  // 先造两条数据
  await page.getByRole('button', { name: '添加病人' }).click();
  await page.getByRole('button', { name: '批量导入' }).click();
  await page.getByPlaceholder(/309W23/).fill('309W23 A 诊断\n309W24 B 诊断');
  await page.getByRole('button', { name: '预览' }).click();
  await page.getByRole('button', { name: '确认导入' }).click();

  const reverseBtn = page.getByRole('button', { name: '反序' });
  await reverseBtn.click();
  await expect(reverseBtn).toHaveClass(/sort-button-active/);

  // 刷新后应保持反序
  await page.reload();
  await expect(page.getByRole('button', { name: '反序' })).toHaveClass(/sort-button-active/);
});

test('视觉回归: 病房单层卡片与紧凑底部导航', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '添加病人' }).click();
  await page.getByRole('button', { name: '批量导入' }).click();
  await page.getByPlaceholder(/309W23/).fill(
    '309W41 林一 股骨骨折\n309W42 周二 胫骨平台骨折\n309W38 陈三 术后恢复\n309WJ04 吴四 换药观察'
  );
  await page.getByRole('button', { name: '预览' }).click();
  await page.getByRole('button', { name: '确认导入' }).click();
  await expect(page.locator('.liquid-sheet')).toHaveCount(0);

  const cluster = page.locator('.patient-cluster').first();
  await expect(cluster).toBeVisible();
  await expect(cluster.locator('.patient-card-embedded')).toHaveCount(2);
  await expect(cluster).toHaveCSS('background-color', 'rgb(255, 255, 255)');

  await page.evaluate(() => document.fonts.ready);
  const rowBoxes = await page.locator('.patient-cluster, .patient-card').evaluateAll((nodes) =>
    nodes
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      })
      .sort((a, b) => a.top - b.top)
  );
  for (let i = 1; i < rowBoxes.length; i++) {
    expect(rowBoxes[i].top - rowBoxes[i - 1].bottom).toBeLessThanOrEqual(12);
  }

  const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(bodyFont).toContain('Noto Sans SC Variable');

  const navBox = await page.getByRole('navigation').boundingBox();
  expect(navBox?.height).toBeLessThan(70);
  expect(navBox?.width).toBeLessThanOrEqual(380);

  await page.screenshot({ path: path.join(SHOTS, 'home-redesign.png'), fullPage: true });
});
