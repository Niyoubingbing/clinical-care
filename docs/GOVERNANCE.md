# 项目治理机制

> 状态：当前规范  
> 生效日期：2026-08-17

## 1. 唯一事实来源

优先级从高到低：

1. 可复现的生产行为、当前 `main` 源码和自动化测试共同确认事实。
2. `PRD.md` 定义产品行为；`docs/ARCHITECTURE.md` 定义技术边界；`docs/OPERATIONS.md` 定义运维动作。
3. Issue/PR 决定尚未合并的工作。
4. `docs/README.md` 标记的历史资料只用于追溯。

代码与当前文档冲突时，先建 `documentation` Issue 记录证据和预期，再在同一 PR 中修正代码或文档。禁止用旧设计稿直接覆盖已验证的生产行为。

## 2. 工作项与优先级

所有非紧急改动先有 Issue，至少包含问题、影响、验收标准、风险等级和隐私确认。

- P0：凭据泄露、数据丢失/破坏、查房/提醒严重错误、生产不可用。立即止损；24 小时内形成事故记录。
- P1：核心流程错误、离线失效、重要性能/可访问性退化。进入最近一次发布。
- P2：一般缺陷与明确改进。按价值和成本排期。
- P3：探索、视觉优化和低频需求。进入 backlog，季度清理。

建议标签：`type:bug`、`type:feature`、`type:docs`、`area:data`、`area:pwa`、`area:clinical-logic`、`area:ui`、`priority:P0..P3`、`risk:L0..L2`、`status:blocked`。

## 3. 分支与 PR

- `main` 永远对应可发布状态；只允许 PR 合并，不允许直接 push 或 Git Data API 覆盖。
- 分支命名：`feat/<topic>`、`fix/<topic>`、`docs/<topic>`、`chore/<topic>`。
- PR 采用 squash merge，标题符合 Conventional Commits；一次 PR 只承担一个可回滚目标。
- L2 变更至少一名审查者明确批准；单人项目也要完成自审清单并等待 CI/Preview 证据。

GitHub 推荐设置：

- 保护 `main`，要求 PR、至少 1 次批准、对话已解决、分支最新。
- 必需状态检查设为 `Quality Gate / Lint, Type Check, Test, Build, E2E`。
- 禁止 force push 和删除 `main`；启用 secret scanning、push protection、Dependabot alerts 和 private vulnerability reporting。
- Vercel 仅把 `main` 设为 Production branch；其他分支只生成 Preview。

## 4. 风险与审查

| 等级 | 示例 | 最低证据 |
| --- | --- | --- |
| L0 | 文档、注释、无行为样式 | lint/build 或跳过说明 |
| L1 | 页面交互、常规领域功能 | 单测 + 构建 + 相关 E2E |
| L2 | schema/迁移、导入清空、床型/查房/提醒、SW/发布 | 旧数据样本、失败注入、全套 CI、回滚方案、Preview 验收 |

审查顺序固定为：隐私/数据安全 → 临床正确性 → 失败与恢复 → 可测试性 → 可访问性/性能 → 可维护性。详细清单见 `CODE_REVIEW.md`。

## 5. Definition of Ready / Done

Ready：

- 问题和用户价值明确；验收标准可用 Given/When/Then 验证。
- 风险等级、影响数据、依赖和不做什么已写清。
- L2 已定义迁移与回滚路径。

Done：

- 代码与文档完成；没有真实病人数据、秘密、日志或构建产物。
- `npm run check` 和 `npm run test:e2e` 通过，CI 与 Vercel Preview 通过。
- PRD/架构/运维文档按触发条件更新。
- 生产发布后完成 smoke，版本与预期提交可追溯。
- Issue 关闭时附验证证据和后续风险。

## 6. 发布与变更管理

- 使用语义化版本。Patch 修复；Minor 向后兼容功能；Major 包含不兼容行为或数据边界变化。
- 版本号是 PWA 更新、问题定位和生产追溯的一部分；发布 PR 明确版本和变更摘要。
- 常规发布：合并 → Vercel Production → 生产 smoke → 观察。L2 发布应预先导出测试数据并做 Preview/离线验证。
- 紧急修复仍走短 PR 与完整门禁；只有生产完全不可用且门禁无法运行时才允许受控例外，事后 24 小时内补 PR、测试和事故记录。

## 7. 维护节奏

- 每周：清理 triage、检查 Dependabot/Actions/Vercel 失败、验证生产首页和 `version.json`。
- 每月：依赖与令牌轮换检查、恢复演练、审阅 P0/P1 和 PRD 已知缺陷。
- 每季度：归档过期文档/Issue、审查浏览器支持、性能和可访问性基线、更新路线图。

建议指标：变更前置时间、部署频率、失败部署率、恢复时间、P0/P1 未关闭天数、CI 首次通过率、测试不稳定率。避免用提交数或代码行衡量产出。
