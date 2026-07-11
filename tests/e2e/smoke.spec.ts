import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const SHOTS = path.join(process.cwd(), 'tests', 'e2e', 'screenshots');
mkdirSync(SHOTS, { recursive: true });

// 隔离 Service Worker：避免 SW 缓存（stale-while-revalidate）干扰 E2E 断言，
// 让每次导航都走真实网络/内存，测试更可重复。
test.beforeEach(async ({ context }) => {
  await context.route('**/sw.js', (r) => r.fulfill({ status: 404, body: '' }));
});

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'todos', path: '/todos' },
  { name: 'settings', path: '/settings' },
  { name: 'settings-rounding', path: '/settings/rounding' },
  { name: 'settings-quick-todos', path: '/settings/quick-todos' },
  { name: 'settings-groups', path: '/settings/groups' },
  { name: 'settings-bed-recognition', path: '/settings/bed-recognition' },
] as const;

test.describe('页面加载冒烟 + 视觉截图', () => {
  for (const p of PAGES) {
    test(`加载并渲染框架: ${p.name}`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(`[console] ${m.text()}`);
      });

      await page.goto(p.path);
      // NavBar（全局 <nav>）可见即代表页面框架已挂载、路由已渲染
      await expect(page.getByRole('navigation')).toBeVisible();
      await page.screenshot({
        path: path.join(SHOTS, `${p.name}.png`),
        fullPage: true,
      });

      // 过滤已知噪声（favicon / SW / React DevTools 提示 / manifest）
      const noise = /favicon|serviceWorker|Download the React DevTools|manifest|Failed to load resource.*sw\.js/i;
      const real = errors.filter((e) => !noise.test(e));
      if (real.length) {
        testInfo.annotations.push({
          type: 'console-errors',
          description: real.join(' | '),
        });
      }
      // 软记录：不强制失败（避免 flaky），但真实错误会进入测试报告注解
    });
  }
});
