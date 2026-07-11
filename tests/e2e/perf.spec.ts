import { test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'tests', 'e2e', 'perf-report.json');

test.beforeEach(async ({ context }) => {
  await context.route('**/sw.js', (r) => r.fulfill({ status: 404, body: '' }));
});

test('首屏关键性能指标（首页，localhost 静态服务基线）', async ({ page }, testInfo) => {
  const start = Date.now();
  await page.goto('/', { waitUntil: 'load' });

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find((p) => p.name === 'first-contentful-paint')?.startTime ?? null;
    return {
      ttfbMs: Math.round(nav.responseStart),
      domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
      loadMs: Math.round(nav.loadEventEnd),
      fcpMs: fcp == null ? null : Math.round(fcp),
    };
  });

  const result = { ...metrics, wallMs: Date.now() - start };
  writeFileSync(OUT, JSON.stringify(result, null, 2));
  testInfo.annotations.push({ type: 'perf', description: JSON.stringify(result) });
});
