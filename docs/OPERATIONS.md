# 开发、发布与故障处理手册

> 状态：当前规范  
> 核对日期：2026-08-17

## 1. 环境与凭据

应用运行时不需要环境变量。GitHub/Vercel 凭据只用于仓库和平台管理，推荐标准变量名：

- `GH_TOKEN`：GitHub CLI/API，最小权限并设置过期时间。
- `VERCEL_TOKEN`：Vercel CLI/API，不放在 `--token` 参数或脚本中。

旧机器变量 `Github_Token` / `Vercel_Token` 只作为迁移来源，不应写进文档示例或继续长期使用。`.env*` 被 Git 忽略；CI 使用 GitHub Actions Secrets 或 Vercel 集成，不在仓库保存值。

## 2. 本地验证

```bash
npm ci
npm run dev
npm run check
npx playwright install chromium
npm run test:e2e
```

`npm run build` 会修改/同步 `public/version.json` 和 `public/sw.js` 中的版本，并生成 `out/`。提交前检查 diff，确认版本变化是有意的。

E2E 由 `tests/e2e/server.mjs` 在 `4321` 端口托管 `out/`，模拟 Vercel 静态路由。若出现 `browserType.launch: spawn EPERM`，先确认当前执行环境是否允许启动无头 Chromium；这不是应用断言失败。

## 3. 标准发布

1. 确保本地基于最新 `origin/main`，创建功能分支。
2. 更新代码、测试、文档；需要发布标识时更新 `package.json` 版本。
3. 运行全套本地检查并推送分支。
4. PR 等待 GitHub `Quality Gate` 和 Vercel Preview，通过模板完成风险/回滚说明。
5. Squash 合并到 `main`；Vercel 自动构建 Production。
6. 验证：首页、`/patient`、`/todos`、`/settings/rounding` 返回 200；`/version.json` 等于发布版本；在测试浏览器执行添加虚构病人、待办、刷新、离线再开。
7. 在 PR/Issue 记录 Production URL、提交 SHA、版本和 smoke 结果。

不要运行 `.github-push.mjs` 或 `deploy-push.mjs`。这类脚本直接更新远端 ref，绕过本地历史、PR、分支保护、CI 和审计，已被 `.gitignore` 标记为本机遗留工具。

## 4. 回滚

代码/静态资源问题：

1. 在 Vercel 将上一个已验证 deployment rollback/promote 为 Production，或 revert 引入问题的 PR。
2. 验证生产路径和 `version.json`。
3. 创建事故 Issue，记录影响窗口、根因和永久修复。

数据问题：

- Vercel 回滚不会修改浏览器 IndexedDB。
- 若新代码已经迁移或覆盖数据，必须先评估旧版本是否还能读取；不能把“平台回滚成功”当作“用户数据已恢复”。
- 使用测试设备和脱敏导出文件演练恢复，禁止把真实导出上传到 GitHub/Vercel。

## 5. 生产故障分流

| 症状 | 首查 | 动作 |
| --- | --- | --- |
| 全站 404/构建失败 | GitHub Actions、Vercel deployment、`vercel.json` | 回滚 deployment；修构建 |
| 页面仍是旧版 | `/version.json`、SW waiting、浏览器缓存 | 让用户确认更新；核对版本是否递增 |
| 仅详情页失败 | `sessionStorage.cc:pid`、`/patient` 200、SW 壳 | 用虚构数据复现导航/刷新/离线 |
| 数据“消失” | 浏览器 profile、IndexedDB、导入/清空操作 | 停止写入；检查备份；不要盲目重装 PWA |
| 查房/床型/提醒错误 | 配置、解析样本、纯函数测试 | 视为 P0/P1；保留脱敏最小样本 |

## 6. 当前仓库恢复说明

2026-08-17 审查发现，本地 `main` 为 `21f2a92`，远端 `origin/main` 为 `285b22f`，本地显示为 1 个独有提交、落后 46 个提交。工作区核心文件与远端最新内容基本一致，但 Git index/历史未同步，这是旧 Git Data API 发布方式造成的。

最安全的恢复方式是：保留当前目录作为只读备份；在新目录重新 clone；从当前目录只复制经审查的新增/修改文件到基于 `origin/main` 的新分支；运行全套检查后走 PR。不要在当前脏工作区执行 `reset --hard`、强制 push 或批量覆盖。若一定要原地修复，先制作文件级备份并由维护者逐步确认 index/branch 重建方案。

## 7. 令牌事件处理

发现令牌进入 remote URL、日志、脚本或公开历史时：

1. 立即在提供方撤销并新建最小权限令牌。
2. 清理本地 Git remote、凭据管理器、CI/Vercel Secrets 和脚本。
3. 搜索仓库与历史；若已进入提交，按平台泄露流程处理，不能只删除最新文件。
4. 记录事故时间线和影响范围，验证旧令牌已无法使用。

本次审查已从本地 remote URL 移除嵌入的 GitHub 令牌；令牌撤销/轮换仍需仓库所有者在 GitHub 完成。系统中的 Vercel 令牌在审查时认证失败，也需轮换。
