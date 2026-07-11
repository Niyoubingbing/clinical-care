import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'tests', 'e2e', 'a11y-report.json');

test.beforeEach(async ({ context }) => {
  await context.route('**/sw.js', (r) => r.fulfill({ status: 404, body: '' }));
});

const TARGETS = [
  { name: 'home', path: '/' },
  { name: 'todos', path: '/todos' },
  { name: 'settings', path: '/settings' },
  { name: 'settings-rounding', path: '/settings/rounding' },
] as const;

test.describe('可访问性扫描 (WCAG 2.1 AA)', () => {
  const all: Record<string, unknown> = {};

  for (const t of TARGETS) {
    test(`扫描: ${t.name}`, async ({ page }, testInfo) => {
      await page.goto(t.path);
      await expect(page.getByRole('navigation')).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const violations = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.help,
        nodes: v.nodes.map((node) => ({
          target: node.target,
          summary: node.failureSummary,
        })),
        helpUrl: v.helpUrl,
      }));
      all[t.name] = { url: t.path, violations };
      testInfo.annotations.push({
        type: 'a11y-violations',
        description: `${t.name}: ${violations.length} 项`,
      });
      expect(violations, `${t.name} must satisfy WCAG 2.1 A/AA checks`).toEqual([]);
    });
  }

  test.afterAll(() => {
    writeFileSync(OUT, JSON.stringify(all, null, 2));
  });
});
