# Clinical Care — 临床病人管理助手

面向移动端查房、病人待办和换药提醒的 local-first PWA。当前版本为 `2.18.1`，生产站点为 [clinical-care.vercel.app](https://clinical-care.vercel.app)。应用代码托管于 GitHub，静态产物由 Vercel 发布；病人和待办数据只保存在当前浏览器的 IndexedDB 中。

> 本项目不是医疗器械或医嘱系统，不能替代医院信息系统、正式病历、医嘱核对和专业判断。不要在公开仓库、Issue、PR、日志或测试附件中提交真实病人信息。

## 当前实现

- Next.js 15 App Router + React 19 + TypeScript 严格模式。
- `output: "export"` 生成纯静态站点；无服务端 API、账户系统或云端数据库。
- Dexie 管理 `patients`、`todos`、`settings` 三张 IndexedDB 表。
- Service Worker 预缓存静态路由与资源，支持离线使用和用户确认后更新。
- Vitest 覆盖 22 个测试文件、166 个测试；Playwright 覆盖流程、冒烟、可访问性和性能基线。

## 本地开发

要求 Node.js 20 和 npm。

```bash
npm ci
npm run dev
```

提交前运行：

```bash
npm run check
npx playwright install chromium
npm run test:e2e
```

`npm run check` 依次执行 ESLint、类型检查、单元测试和生产构建。E2E 依赖已经生成的 `out/`。

## 文档入口

- [2.18.0 床位识别、查房顺序与修复说明](./docs/RELEASE-2.18.0.md)

- [产品需求（当前行为）](./PRD.md)
- [系统架构](./docs/ARCHITECTURE.md)
- [项目治理](./docs/GOVERNANCE.md)
- [开发、发布与故障处理](./docs/OPERATIONS.md)
- [本次项目审查](./docs/REVIEW-2026-08-17.md)
- [贡献指南](./CONTRIBUTING.md)
- [安全与隐私](./SECURITY.md)
- [文档状态索引](./docs/README.md)

发生“文档与实现不一致”时，运行中的代码和自动化测试用于确认事实；确认后必须在同一 PR 中更新 PRD/架构/运维文档。历史设计稿只用于解释决策，不作为当前验收依据。

## 发布模型

功能分支提交 PR，`Quality Gate` 全绿并完成审查后 squash 合并到受保护的 `main`。Vercel 从 `main` 自动发布 Production，PR 生成 Preview。禁止使用仓库中的旧 Git Data API 脚本覆盖远端 `main`；完整流程见 [OPERATIONS.md](./docs/OPERATIONS.md)。
