import { defineConfig } from '@playwright/test';

// 本地等价测试配置：
// - webServer 启动 tests/e2e/server.mjs，托管 out/ 静态导出产物（= 线上 Vercel 部署的同一份）
// - 若要对线上真实 URL 测试，把 baseURL 改为 https://clinical-care.vercel.app 并确保本机网络可达
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 30000,
  expect: { timeout: 8000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4321',
    headless: true,
    // 移动优先（PRD 目标设备）：iPhone 12/13 视口
    viewport: { width: 390, height: 844 },
    actionTimeout: 8000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node tests/e2e/server.mjs',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
