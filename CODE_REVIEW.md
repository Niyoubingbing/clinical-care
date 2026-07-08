# 临床护理 PWA — 代码审查标准与流程

> 适用仓库：`clinical-care`（Next.js 15 App Router + React 19 + TypeScript + Dexie/IndexedDB + Framer Motion + Tailwind + 静态导出 PWA）
> 维护者：火眼眼（Code Review Expert）
> 版本：1.0 ｜ 最后更新：2026-07-08

---

## 0. 为什么需要这份文档

本仓库是**离线优先的临床工具**，数据完全存于用户浏览器（IndexedDB），没有后端、没有服务端鉴权。这带来两个特质：

1. **临床正确性是头等大事**：查房顺序错一位、换药状态记错一天，都会直接影响真实诊疗。
2. **客户端就是生产环境**：一个白屏、一次误清空 IndexedDB，用户本地数据当场丢失，且无法回滚。

代码质量参差不齐的根因通常是「只靠作者自觉、没有统一红线」。本文档把红线写清楚，让审查**可预期、可教学、不靠心情**。

审查的底层原则（火眼眼准则）：

- **教，而不是挡** —— 每条意见都要解释 why，而不是只下指令。
- **重实质，轻风格** —— 不纠结缩进/引号，交给 ESLint/Prettier。
- **一次给全** —— 一个 PR 一轮给完整反馈，不跨轮 drip-feed。

---

## 1. 角色与职责

| 角色 | 职责 |
| --- | --- |
| **作者 (Author)** | 写清 PR 描述；提交前完成[自检清单](#8-pr-模板与自检清单见-github)；保持 PR 小而聚焦；及时回应意见 |
| **审查者 (Reviewer)** | 至少 1 名；核心数据/临床逻辑改动需 2 名；按本文档给分级意见；不代作者改代码（除非授权） |
| **责任人 (Owner)** | 合并前确认所有 🔴 已解决或经协商降级；负责最终质量兜底 |

> 核心模块定义：`lib/db.ts`、`lib/export-import.ts`、`lib/rounding.ts`、`lib/rounding-edit.ts`、`lib/bed-parser.ts`、`components/Providers.tsx`，以及任何改动 `Patient`/`Todo`/`RoundingConfig` 数据模型的代码。

---

## 2. 严重度分级（与审查意见标签一致）

| 标记 | 名称 | 含义 | 合并门禁 |
| --- | --- | --- | --- |
| 🔴 | **阻断 (Blocker)** | 正确性/安全/数据丢失/破坏契约，必须修 | 未解决**禁止合并** |
| 🟡 | **建议 (Suggestion)** | 可维护性/性能/健壮性隐患，应当修 | 需作者回复（修 or 说明理由） |
| 💭 | **可选 (Nit)** | 命名/文档/小优化，nice to have | 不阻塞，鼓励修 |

**降级规则**：🔴 只有在审查者与作者双方确认「误报/可接受风险并留 issue 跟踪」时才可降级，且必须在 PR 里记录原因。

---

## 3. 审查流程（端到端）

```
作者开发 ──▶ 本地自检(.github 自检清单) ──▶ 开 PR(填模板)
   │                                            │
   │                                     CI 门禁(lint+tsc) 自动跑
   │                                            │
   └──────────── 不达标打回 ◀── 红 ✗ / 🔴 未解决
                                                │
                                          Reviewer 给分级意见
                                                │
                                         作者修订 → 重新审查
                                                │
                                    所有 🔴 解决 → Owner 合并
```

### 3.1 PR 准入门槛（作者自查）
- [ ] **单一职责**：一个 PR 只做一件事（修 bug / 加功能 / 重构分开）。混合 PR 直接要求拆分。
- [ ] **体量可控**：单 PR 建议 < 400 行改动；超过请拆或说明。
- [ ] **描述完整**：背景、改了什么、怎么验证、关联 PRD 条款（如「PRD 4.9.3」）。
- [ ] **自检清单**已逐项勾选（见 §8）。
- [ ] **无调试残留**：`console.log`、临时 `alert`、`debugger` 已清除。

### 3.2 CI 门禁（自动）
PR 触发 `.github/workflows/ci.yml`，必须全绿才能 review：
1. `npm run lint`（Next ESLint，含 `eslint-config-next`）
2. `npx tsc --noEmit`（严格类型检查）

> 完整 `next build`（静态导出 + SW 预缓存注入）由 Vercel 在 push 到 `main` 时负责，不在 PR 门禁里重复跑，避免双倍构建成本。但**任何触碰 `next.config.mjs`、SW、`scripts/` 的 PR，作者需额外在描述里附本地 `npm run build` 结果**。

### 3.3 审查轮次与节奏
- 常规 PR：**1 个工作日内**给出首轮意见。
- 作者修订后：**重新请求 review**，勿静默 push 后等对方发现。
- 超过 2 轮仍有 🔴 未决 → 升级到 Owner 或拉会拍板，不悬而未决。

### 3.4 意见处理
- 作者可对每条意见回复「已修 / 有不同看法（说明理由）/ 留 issue」。
- 对 🟡 有分歧时，以「是否会在 6 个月后坑到维护者」为判据。
- 禁止用「LGTM」式空 review 刷合规；审查者需留下至少一条实质性 comment 或明确声明「仅文档/样式，无逻辑风险」。

### 3.5 合并与回滚
- 合并方式：Squash merge，commit message 用 PR 标题 + 关联 PRD/issue。
- 合并即发布（Vercel 自动部署）：**合并前最后确认** —— 改动是否影响 IndexedDB 既有数据？是否需要写迁移？
- 若发布后发现问题：Vercel 一键回滚到上一个 deployment；IndexedDB 用户数据不随回滚，需评估是否需要客户端迁移补偿。

### 3.6 快捷路径
- **纯文档 / 文案 / 样式微调**：可免双人 review，但仍需过 CI。
- **紧急热修 (hotfix)**：可先合并后补 review，但必须在 24h 内补齐 🔴 复核，并开 issue 跟踪。

---

## 4. 通用审查清单（按严重度）

### 🔴 阻断（必须修）
- [ ] **正确性**：逻辑是否真的做了它声称做的事？边界值（空数组、undefined、0、负数）处理了吗？
- [ ] **数据安全**：是否可能误清空/覆盖 IndexedDB（`clear()` 前是否先完整校验）？跨表操作是否包在事务里？
- [ ] **输入校验**：外部来源（文件导入、URL 参数、`localStorage`、用户设置项）是否校验？畸形输入会不会崩？
- [ ] **崩溃风险**：`JSON.parse` / `new RegExp(userInput)` / 数组越界 是否有 try/catch 或前置校验？
- [ ] **关键路径错误处理**：异步操作（`await db...`）失败有没有兜底？会不会让 UI 卡死在加载态？

### 🟡 建议（应当修）
- [ ] **命名与可读性**：函数/变量名能否让 6 个月后的维护者一眼懂？`p`/`t`/`s` 这种单字母是否该展开？
- [ ] **重复代码**：三处以上相似逻辑是否该抽成 `lib/` 函数？
- [ ] **性能**：列表是否会在大数据量下卡顿（是否该用 `@tanstack/react-virtual` 虚拟化）？`useLiveQuery` 查询是否命中索引、避免全表扫描？
- [ ] **竞态**：读改写（read-modify-write）是否可能丢更新？是否该用 Dexie 事务或 `db.x.update(id, fn)`？
- [ ] **测试覆盖**：核心逻辑改动是否补了测试？（见 §6）

### 💭 可选（nice to have）
- [ ] 注释是否解释了「为什么」而非「是什么」？
- [ ] 是否有更地道的 API / 更简单的实现？
- [ ] 文档（README / PRD 引用）是否需要同步更新？

---

## 5. 技术栈专项条款（本项目重点）

> 以下条款针对本仓库实际代码，引用真实文件位置，便于审查时直接对照。

### 5.1 临床正确性（🔴 最高风险区）
- **查房顺序 `resolveOrder`（`lib/rounding.ts`）**：
  - 床号匹配逻辑（全床号 vs 基础床号、病区隔离 `groupId = block.id#ward`）改动后，**必须**用真实床号样本验证顺序，附验证结果到 PR。
  - 未进入任何块的病人追加顺序（病区 + 基础床号升序）是否符合预期？
- **业务规则联动**：`toggleTodo` 完成「换药」时联动 `lastDressingChange`（`lib/db.ts:259`）—— 任何改动都要确保这条临床规则不被破坏；取消完成时要正确回退。
- **床号解析 `bed-parser` / 模板 `bedTemplate`（`lib/bed-parser.ts`、`types` 的 `bedTemplate`）**：
  - ⚠️ `bedTemplate` 是**用户可在设置页编辑的正则字符串**，畸形正则（如未闭合括号）会在 `new RegExp()` 时抛错导致整个解析崩溃。**必须**在写入设置前校验正则合法性（捕获 `SyntaxError`）。
  - `specialMarks`（如 `"J"`/`"YZ"`）解析与展示是否一致。

### 5.2 Dexie / IndexedDB 数据层
- ✅ **现有良好模式（继续保持）**：`importClinicalData`（`lib/export-import.ts:62`）先逐条校验、再开事务清空写入 —— 这条「先校验后清空」红线**必须**在所有导入/重置路径坚持，禁止「清空后写残缺数据」。
- **事务使用**：跨表操作（如 `deletePatient` 同时删 `todos`）必须包 `db.transaction("rw", ...)`（现有实现是对的，新增类似逻辑照做）。
- ⚠️ **`readFileAsText` 无大小上限**（`lib/export-import.ts:35`）：导入超大/恶意 JSON 会撑爆内存。**建议**加文件大小上限（如 10MB）并在超限时友好报错。
- ⚠️ **`updateSettings` 读改写竞态**（`lib/db.ts:204`）：`getSettings()` 后 `put` 全量，并发编辑会互相覆盖。**建议**对该类更新用 Dexie 的事务或字段级 `update`，避免整行覆盖。
- **订阅回环防护**：`useLiveQuery` + 迁移写回容易形成「读里写」回环（已在 `ensureSettingsMigrated` 用模块级 flag 一次性解决）。新增 querier 内**禁止**直接写回数据库。

### 5.3 PWA / Service Worker / 静态导出
- ⚠️ **`output: "export"` 硬约束**（`next.config.mjs`）：
  - 禁止新增 API Route / Route Handler（无服务端运行时）。
  - 禁止依赖服务端渲染（`getServerSideProps` 等）—— 不存在。
  - `next/image` 已 `unoptimized: true`，新增图片用 `<img>` 或确认不使用运行时优化。
- **SW 生命周期**（`components/Providers.tsx`）：
  - ✅ dev 模式不注册 SW（避免缓存 dev chunk 导致白屏）—— 保持。
  - `skipWaiting` 必须**仅由用户点「更新」触发**，禁止自动激活（否则已打开标签页会被强制刷新丢状态）。
  - 任何改动 SW 注册/更新逻辑，必须在描述里附 `npm run build` 产物校验（`qa_verify.cjs` 检查 precache 注入、路由存在、`patient/[id]` 动态目录不存在）。
- **Preache 注入脚本** `scripts/gen-sw-precache.mjs`：构建后必须成功替换 `__PRECACHE_LIST__` 占位符，否则离线失效。

### 5.4 React 19 / Next.js App Router
- **`"use client"` 精准使用**：仅在有交互/状态/`useEffect` 的文件加；纯展示组件保持服务端组件，别无脑加。
- **Server/Client 边界**：服务端组件不得直接 import 仅客户端的模块（`dexie`、`dexie-react-hooks`、`framer-motion`）。
- **列表 key = 稳定 id**：拖拽/排序类（如查房顺序编辑）必须用**稳定唯一 id** 作 `key`/`value`，绝不可用数组索引或对象引用（已知坑：索引作 key 会导致拖拽一拖就回弹、状态错乱）。
- ✅ **`React.memo`**（`components/SwipeableTodo.tsx` 等）减少不必要的重渲染 —— 列表项组件保持 memo。
- ✅ **`MotionConfig reducedMotion="user"`**（`Providers.tsx`）尊重系统减弱动效 —— 所有新增动效保持此约定。

### 5.5 TypeScript 严格模式
- ⚠️ **禁止用 `as X[]` 跳过校验**：`parseClinicalJSON`（`lib/export-import.ts:49`）目前把 `obj.patients as Patient[]` 直接断言，**运行时校验和类型脱节**。新增导入/解析逻辑应复用 `importClinicalData` 的逐字段校验，或抽统一的 `validatePatient` 函数，让类型与运行时校验一致。
- **数据模型兼容性**：新增 `Patient`/`Todo`/`RoundingConfig` 字段必须考虑旧数据迁移（参考 `migrateRoundingOrder`、`ensureSettingsMigrated`），不能假设字段一定存在。
- 禁用 `any`；未知外部输入先用 `unknown` + 类型守卫收窄（现有 `migrateRoundingOrder` 是范例）。

### 5.6 安全（客户端 PWA 视角）
> 本应用无后端、无多用户，传统 SQL 注入/XSS-in-server 不适用，但以下仍属 🔴：
- ⚠️ **不受信 JSON 解析**：导入文件来自用户磁盘/第三方差分，`JSON.parse` 必须 try/catch + 大小上限（见 5.2）。
- **渲染用户输入**：禁止 `dangerouslySetInnerHTML` 渲染任何用户数据（病人姓名、诊断等），React 默认转义即可；若确有需要，必须 sanitize。
- **数据不外泄**：IndexedDB 内容不发送到任何外部域名；`fetch` 仅限同源（`/version.json`、`/sw.js`）。
- **`localStorage` 仅存开关**（如 `cc-dev-sw`），不存临床数据。

### 5.7 可访问性 / 移动端
- ✅ 滑动手势（`SwipeableTodo`）已配等价按钮（完成/删除）—— **所有手势操作都必须有非手势等价入口**。
- 交互元素需 `aria-label`（现有已实现，新增保持一致）。
- 触摸目标 ≥ 44×44（现有 `h-11 w-11` 按钮符合）。

### 5.8 性能
- 大数据集列表用 `@tanstack/react-virtual` 虚拟化（现有首页/待办已用，新增长列表照做）。
- `useLiveQuery` 查询应利用 Dexie 索引（`patients: "id, bedNumber, name"` 等），避免 `patients.filter` 全表扫描后在前端排。
- 渲染期避免重复重算（床号解析、分组等可 memo 或预存字段，如 `bedBase`/`ward` 已持久化到 `Patient`）。

---

## 6. 测试标准（当前最大缺口）

**现状**：仓库无任何测试框架、无 `test` 脚本、除 `node_modules` 外零测试文件。这是质量参差不齐的主因之一。

**目标分级策略**：

| 层级 | 范围 | 工具建议 |
| --- | --- | --- |
| 单元 | `bed-parser`、`rounding.resolveOrder`、`time-parser`、`export-import` 校验 | Vitest |
| 集成 | Dexie 导入/导出/迁移（用 `fake-indexeddb`） | Vitest + fake-indexeddb |
| E2E | 关键路径：加病人→生成查房顺序→完成换药联动 | Playwright（后续） |

**强制要求**：
- 🔴 任何改动 `resolveOrder` / `bed-parser` / 导入导出校验 的 PR，**必须**附带对应单元测试，覆盖病态输入（空、畸形床号、跨病区、未匹配病人）。
- 🟡 核心业务逻辑新功能默认带测试；纯 UI 改动可暂免，但鼓励补。
- 引入方式：`npm i -D vitest @testing-library/react fake-indexeddb`，加 `test` 脚本与 `vitest.config.ts`，并把 `npm test` 接入 CI（见 §9）。

---

## 7. 审查意见写法（模板）

审查者用统一格式，确保可教学：

```
🔴 **[类别] 简短标题**
位置：lib/export-import.ts:35 `readFileAsText`

**为什么**：导入一个 500MB 的恶意 JSON 会直接撑爆浏览器内存，
导致标签页崩溃、用户本地数据不可用。

**建议**：
- 在 readFileAsText 前用 `file.size` 限制（如 >10MB 直接 reject 并提示）；
- 或改用流式读取 + 预算上限。
```

```
🟡 **[可维护性] 命名歧义**
位置：lib/rounding.ts:30 `byBed`

**为什么**：`byBed` 实际是 bedNumber→Patient 的 Map，
与「bed」歧义（基础床号？完整床号？）。6 个月后易读错。

**建议**：改名 `byFullBedNumber` 或 `patientByBedNumber`。
```

```
💭 **[可选] 可抽公共函数**
lib/db.ts 中 `todayStr` 与 `formatDate` 逻辑重复，
可合并为一个 `formatDate(d, withTime?)`。
```

---

## 8. PR 模板与自检清单（见 `.github/`）

- **`.github/PULL_REQUEST_TEMPLATE.md`**：作者开 PR 时自动带出自检清单 + 描述模板。
- **`.github/REVIEW_CHECKLIST.md`**：审查者逐条勾选的核对表（镜像 §4 / §5）。

作者开 PR 前务必逐项自检；审查者以 `REVIEW_CHECKLIST.md` 为锚，不凭记忆遗漏。

---

## 9. CI 门禁（见 `.github/workflows/ci.yml`）

PR 到 `main` 自动运行：
1. `npm ci`
2. `npm run lint`
3. `npx tsc --noEmit`

（后续接入 `npm test` 后，第 4 步加入单测。）Vercel 负责完整构建与部署。

> **当前基线说明（已知债务）**：建立本门禁时为让基线可绿，已补 `.eslintrc.json`（`next/core-web-vitals` + `next/typescript`），并修掉 `lib/time-parser.ts` 的一处 `prefer-const` 错误。当前 `next lint` 仅**报错（Error）才会让 CI 失败**，warning 不阻断。
> 现存 warning 主要为未使用变量（`@typescript-eslint/no-unused-vars`）与 `react-hooks/exhaustive-deps` 依赖提示 —— 属可维护性问题，建议在迭代中逐步清理，**不强制**在单个 PR 清零，但新增代码应避免引入新的未使用变量。
> ⚠️ `next lint` 已在 Next.js 15 标记 deprecated，Next 16 将移除；届时需迁移到 ESLint CLI（`npx @next/codemod@canary next-lint-to-eslint-cli .`）并相应更新本 workflow。

---

## 10. 度量与持续改进

- **跟踪指标**（Owner 每月看一次）：平均审查周期、🔴 数量趋势、合并后缺陷逃逸数。
- **标准回顾**：每季度或每次出现「标准没覆盖到的线上问题」时，更新本文档，并把该案例沉淀进对应条款。
- **知识沉淀**：典型坑（如 Reorder 稳定 id、读里写回环、SW 白屏）写入 `docs/` 或本项目 memory，避免重复踩。

---

## 附录 A：现有代码中的良好实践（请保持）

以下现有实现符合标准，审查时**不应**要求改动，新代码请对齐：

- ✅ `importClinicalData` 先逐条校验再开事务清空写入（`lib/export-import.ts:62`）—— 防数据丢失红线典范。
- ✅ `deletePatient` 用跨表事务（`lib/db.ts:227`）。
- ✅ 迁移写回用模块级 flag 一次性执行，消除「读里写」订阅回环（`lib/db.ts:182`）。
- ✅ dev 模式不注册 SW，避免缓存 dev chunk 致白屏（`components/Providers.tsx:130`）。
- ✅ SW 更新仅由用户触发 `skipWaiting`，不自动刷新（`Providers.tsx:240`）。
- ✅ 列表项 `React.memo` + `MotionConfig reducedMotion="user"`（可访问性）。
- ✅ `useCallback`/`useRef` 合理管理定时器与事件监听的清理（`Providers.tsx` 的 `useEffect` 返回清理函数）。
- ✅ 构建后 `qa_verify.cjs` 校验 PWA precache 与静态路由完整性。
