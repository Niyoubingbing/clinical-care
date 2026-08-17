# 贡献指南

## 工作流

1. 从最新 `origin/main` 创建 `feat/*`、`fix/*`、`docs/*` 或 `chore/*` 分支。
2. 先建 Issue 或在 PR 中写清问题、验收标准和风险等级。
3. 保持一次 PR 只解决一个问题，使用 Conventional Commits，例如 `fix(reminders): avoid duplicate dressing todo`。
4. 本地执行 `npm run check` 和 `npm run test:e2e`。
5. 创建 PR，等待 `Quality Gate`、Vercel Preview 和代码审查通过。
6. 采用 squash merge；禁止直接向 `main` 推送。

## 风险等级

- L0：文档、注释或不改变行为的样式。完成 lint/build 或说明跳过理由。
- L1：常规功能和非关键交互。要求单元测试、构建、相关 E2E。
- L2：IndexedDB schema/迁移、导入清空、床型/查房顺序、换药/提醒、Service Worker、发布配置。必须提供兼容性、失败路径、回滚方案和覆盖旧数据的测试。

## 完成标准

- 验收标准可复现，正常/边界/失败路径均有证据。
- 类型、lint、单元测试、构建和 E2E 全绿；确实不适用的检查在 PR 中解释。
- 数据模型变更考虑旧 IndexedDB 数据与导入文件兼容。
- 修改 `package.json` 版本时，构建会同步 `version.json` 与 Service Worker 版本。
- 修改行为、架构、部署或运维方式时，同一 PR 更新相应文档。
- 不含真实病人信息、导出数据、令牌、`.env`、日志、截图测试产物。

更完整的决策、审查和发布机制见 [docs/GOVERNANCE.md](./docs/GOVERNANCE.md)。
