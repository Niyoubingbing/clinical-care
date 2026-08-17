# 审查者核对清单（Reviewer Checklist）

> 配合 `CODE_REVIEW.md` 使用。审查时逐条过，不在记忆里漏项。
> 意见分级：🔴 阻断（禁合并）｜🟡 建议（需回应）｜💭 可选。

## 一、通用（每条都过）

### 🔴 阻断
- [ ] 正确性：逻辑真做了声称的事？边界值（空/undefined/0/负）处理了？
- [ ] 数据安全：有无误清空/覆盖 IndexedDB 风险？跨表操作包事务？
- [ ] 输入校验：外部来源（文件/URL/localStorage/用户设置）都校验了？畸形输入不崩？
- [ ] 崩溃风险：`JSON.parse` / `new RegExp(用户输入)` / 越界 有 try-catch 或前置校验？
- [ ] 关键路径：异步失败有兜底？UI 不会卡死在加载态？

### 🟡 建议
- [ ] 命名可读：6 个月后能一眼懂？单字母 `p/t/s` 该展开？
- [ ] 重复代码：≥3 处相似是否该抽 `lib/` 函数？
- [ ] 性能：大列表用虚拟化？`useLiveQuery` 命中索引、无全表扫描？
- [ ] 竞态：读改写有无丢更新？该用事务 / 字段级 `update`？
- [ ] 测试：核心逻辑改动补测试了吗？

### 💭 可选
- [ ] 注释解释 why 而非 what？
- [ ] 有更地道/更简实现？
- [ ] 文档/PRD 引用需同步更新？

## 二、技术栈专项

### 临床正确性（🔴 最高风险）
- [ ] `resolveOrder` 床号匹配（全床号/基础床号/病区隔离）改后附验证？
- [ ] 未匹配病人追加顺序符合预期？
- [ ] `toggleTodo` 联动 `lastDressingChange` 未被破坏、取消可回退？
- [ ] `bedTemplate` 用户正则写入前校验合法性（捕获 `SyntaxError`）？

### Dexie / IndexedDB
- [ ] 导入/重置遵循「先校验后清空」？
- [ ] 跨表操作包 `db.transaction("rw", ...)`？
- [ ] `readFileAsText` 有文件大小上限？
- [ ] `updateSettings` 读改写无并发覆盖风险？
- [ ] querier（`useLiveQuery`）内无直接写回？

### PWA / SW / 静态导出
- [ ] 无新增 API Route / 服务端渲染？`next/image` 不用运行时优化？
- [ ] SW：`skipWaiting` 仅用户触发、dev 不注册？
- [ ] 改 SW/构建：`npm run build` 产物经 `qa_verify.cjs` 校验（precache/路由/`patient/[id]` 不存在）？

### React 19 / App Router
- [ ] `"use client"` 仅必要文件？Server 不 import 仅客户端模块？
- [ ] 列表/拖拽 key 用稳定 id，非索引/对象引用？
- [ ] 列表项 `React.memo`？动效 `reducedMotion="user"`？

### TypeScript
- [ ] 无 `as X[]` 跳过校验？类型与运行时校验一致？
- [ ] 新字段考虑旧数据迁移？禁用 `any`，未知输入用 `unknown` + 守卫？

### 安全（客户端视角）
- [ ] 不受信 JSON：`try-catch` + 大小上限？
- [ ] 无 `dangerouslySetInnerHTML` 渲染用户数据？
- [ ] 无临床数据外发到外部域名？

### 可访问性 / 移动端
- [ ] 手势操作有非手势等价入口（按钮）？
- [ ] 交互元素有 `aria-label`？触摸目标 ≥ 44×44？

## 三、收尾
- [ ] 所有 🔴 已解决或经协商降级并记录原因
- [ ] 🟡 作者已回复（修 or 理由）
- [ ] CI 门禁（lint + tsc）全绿
- [ ] 合并方式确认：Squash，message 含 PR 标题 + 关联条目
