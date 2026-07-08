# 临床护理 PWA 深度架构审查报告

> 审查对象：`D:\Document\OneDrive - uppingallthetime\Document\Project-Management\WorkRoom\PWA`
> 审查目标：把"卡顿"和"离线不达标"的根因钉死，给出可执行、按优先级排序的修复计划。
> 方法：实际 Read 了下列文件并逐行核对，所有结论均引用 `file:line`，不含推测。

已读文件：`app/page.tsx`、`app/todos/page.tsx`、`app/patient/[id]/page.tsx`、`app/layout.tsx`、`app/template.tsx`、`components/Providers.tsx`、`components/NavBar.tsx`、`components/PatientCard.tsx`、`components/GroupedPatientCard.tsx`、`components/TodoListView.tsx`、`components/SwipeableTodo.tsx`、`components/QuickTodoBar.tsx`、`lib/db.ts`、`lib/rounding.ts`、`lib/reminders.ts`、`lib/summary.ts`、`lib/bed-parser.ts`、`lib/motion.ts`、`app/settings/rounding/page.tsx`、`app/settings/groups/page.tsx`、`app/settings/quick-todos/page.tsx`、`public/sw.js`、`public/manifest.json`、`next.config.mjs`、`scripts/sync-version.mjs`，并对全仓 `useLiveQuery`/`Reorder` 调用点做了 grep 统计。

---

## 1. 性能根因清单（卡顿）

> 重度说明：高=直接造成明显卡顿；中=放大卡顿/次要路径；低=观察项。

### P1 — 首页卡片 `React.memo` 被内联回调击穿（高｜首要根因）
- **证据**
  - `app/page.tsx:181-183` `openDetail` 在组件体内直接定义，**非** `useCallback`，每次渲染都是新函数引用。
  - `app/page.tsx:298` 与 `:309` `onMenu={(patient) => setMenuPatient(patient)}` 为**内联箭头函数**，每次渲染新引用。
  - `components/PatientCard.tsx:140` 与 `components/GroupedPatientCard.tsx:75` 都是 `React.memo` 包裹。
- **机制**：`PatientCard`/`GroupedPatientCard` 通过 `memo` 防止无谓重渲染，但接收的 `onOpen`(=openDetail)、`onMenu` 每次都是新引用 → `memo` 的浅比较永远失败 → **每次 `HomePage` 重渲染都重渲染全部卡片**。
- **触发场景**：勾选/取消任一待办（`todos` 写入 → `app/page.tsx:34` 的 `useLiveQuery` 重跑 → `HomePage` 重渲染）、切换分组筛选、打开任意 BottomSheet 等**任何** state 变化 → 整页 N 张卡全部重渲染。
- **量化**：`toggleTodo` 一次写入（`lib/db.ts:235-266`，且若类型为"换药"还会写 `patients`:254-258）→ `HomePage` 重渲染 → 全部 `PatientCard` 重渲染。`N` 为病房病人数（临床常 30–60+），这是"好多卡顿"的主因。

### P2 — `useLiveQuery` 全局订阅导致的重渲染雪崩（高）
- **证据**：全应用约 **13 处** `useLiveQuery` 订阅点（grep 结果，排除 node_modules）：
  - `todos` 表被 ≥6 处订阅：`NavBar.tsx:18`、`app/page.tsx:34`、`app/todos/page.tsx:32`、`app/patient/[id]/page.tsx:39`、`app/settings/page.tsx:42`、`components/BatchImportSheet.tsx:26`、`components/QuickTodoBar.tsx:15`。
  - `patients` 表被 ≥5 处订阅：`app/page.tsx:32`、`app/todos/page.tsx:33`、`components/BatchImportSheet.tsx:25`、`app/settings/page.tsx:41`、`app/settings/bed-recognition/page.tsx:13`、`app/patient/[id]/page.tsx:38`。
  - `settings` 表被 ≥6 处订阅：`Providers.tsx:74`、`app/page.tsx:36`、`components/PatientFormSheet.tsx:21`、`components/BatchImportSheet.tsx:27`、`app/settings/page.tsx:40`、`app/settings/{groups,quick-todos,rounding}/page.tsx`、`app/patient/[id]/page.tsx:43`。
- **机制**：Dexie `useLiveQuery` 底层是 `liveQuery`（`node_modules/dexie-react-hooks/.../dexie-react-hooks.mjs:100-101`），**任意一次对观察表的写入都会让所有订阅该表的组件重跑 querier 并重渲染**。所以"勾一个待办"会同时重渲染 `NavBar`、`HomePage`、`TodosPage`（若挂载）、`PatientDetailPage`（若挂载）、`settings/*`（若挂载）等。
- **订阅回环隐患**：`lib/db.ts:170-185` 的 `getSettings()` 在 querier 内对 legacy 数据执行 `db.settings.put(...)`（`:182`）。`liveQuery` 观察 `settings` 表读取，写入后该表变化 → 触发自身重跑（legacy 数据首屏一次性双渲染；`Providers.tsx:74` 与 `app/page.tsx:36` 两处同时订阅 `getSettings()`，回环叠加）。非无限循环，但是架构级"读里写"反模式，应移出 querier。

### P3 — 全列表派生计算每次重算 + 分组 items 引用不稳定（中）
- **证据**
  - `app/page.tsx:91-116` `rows` 的 `useMemo` 依赖 `[ordered, todos, today]`；每次 `todos` 变化就重算，内部对**每位病人**调用 `patientStatus`（`lib/reminders.ts:114`，内部 `todos.filter`）+ `pendingTodoCount`（`lib/reminders.ts:136`，再 `filter` 一次）→ 复杂度约 O(病人数 × 待办数)。
  - `app/page.tsx:169-177` `bedInfoMap` 用 `parseBed`（正则，见 `lib/bed-parser.ts:29-80`）逐病人解析，依赖 `[patients, settings]`，本身还算合理。
  - `app/page.tsx:102-107` 构造 `GroupedItem` 时每次 `rows` 重算都生成**新的对象数组** `items`。`GroupedPatientCard` 接收 `items`（`:296`），即便 `onOpen`/`onMenu` 已稳定，`items` 新引用仍使 memo 失效 → 整组每次数据变化必重渲染。
- **结论**：单卡的 `bedType`/`specialType` 是稳定的，但 `status`/`todoCount` 变化确实需要重渲染；问题是**连带把未变化的卡也拖入重渲染**（见 P1），且分组卡因 `items` 引用无法被 memo 救。

### P4 — 待办页同样存在 memo 击穿（中）
- **证据**
  - `app/todos/page.tsx:83-111` `onToggle`/`onDelete`/`onOpen` 均为内联函数（非 `useCallback`）。
  - `app/todos/page.tsx:73` `passFilter` 内联且未 `useMemo` → `TodoListView.tsx:38-45` 的 `pending`/`completed` `useMemo` 每次 `TodosPage` 渲染都重算。
  - `TodoListView` 本身未 `memo`；`SwipeableTodo.tsx:190` 虽 `React.memo`，但接收的 `onToggle`/`onDelete`/`onOpen` 每次都是新引用 → **每条待办在 `TodosPage` 每次渲染时全部重渲染**。
- **触发场景**：在待办页勾选一条 → `TodosPage` 重渲染 → 全部 `SwipeableTodo` 重渲染（数量级同 P1）。

### P5 — 快捷待办 `Reorder` 使用数组索引作 id（中｜已知反模式）
- **证据**：`app/settings/quick-todos/page.tsx:84` `values={list.map((_, i) => \`qt-${i}\`)}`、`:91` `id={\`qt-${i}\`}`、`:90` `key={\`qt-${i}\`}`，`QuickTodo` 对象本身**没有稳定 id 字段**，全部用数组下标拼装。
- **对比**：`groups` 页（`:126`/`:170`/`key={g.id}`）与 `rounding` 页（`:231`/`:337`/`key={b.id}`）已正确使用稳定 `id`，**只有 quick-todos 不一致**。
- **问题**：Framer `Reorder` 以 `value` 标识拖拽实体，索引随重排漂移 → 拖拽时整列表 `layout` 重测量/动画错位、偶发卡顿。`onReorder`（`:45-51`）虽能靠"当前 list 按索引重映射"勉强得到正确顺序，但交互层脆弱。
- **修复**：给 `QuickTodo` 增加 `id: string` 字段，`values={list.map(q=>q.id)}`、`value={qt.id}`、`key={qt.id}`。

### P6 — 无列表虚拟化（中｜与 changelog 描述不符）
- **证据**：全仓（排除 node_modules）grep `virtual|react-window|@tanstack|windowing|useVirtualizer` **无任何命中**。`app/page.tsx`（377 行）与 `app/todos/page.tsx` 均未实现虚拟化。
- **问题**：PRD 历史 changelog 提到"列表虚拟化仅在 >100 才用"，但**代码里根本没实现**。大病房（>50 病人）下，P1/P3 的"全列表重渲染"会被进一步放大为明显滚动卡顿。

### P7 — `template.tsx` 每导航重挂载（低｜观察）
- **证据**：`app/template.tsx` 每次路由切换重新挂载 `motion.div`（`opacity+y`，见 `lib/motion.ts:15-18`，已避免 `scale`）。本身 compositor-friendly，非卡顿主因；但在 P2 描述的"客户端 RSC 导航失败→硬刷新"场景下会叠加一次整页动画闪烁。

---

## 2. 离线根因清单（离线不达标）

### A — 架构级错配：SSR + 手写 SW ≠ PWA 离线（P0）
- **证据**：`next.config.mjs`（全文 9 行）**没有** `output: 'export'`，即默认服务端渲染（部署 Vercel）。`app/patient/[id]/page.tsx` 是 `"use client"` 组件，但仍是 SSR 路由，**无 `generateStaticParams`**，每次导航由服务端按需渲染。
- **与 PRD 矛盾**：PRD §15.1 要求 Static Export、§15.3 要求"首次加载后所有功能无网络可用"。当前架构是"服务端渲染 + 客户端 IndexedDB 取数"，离线能力和 PRD 直接冲突。
- **后果**：任何未缓存的路由（尤其动态 `/patient/*`）离线时无法由服务端生成 HTML，只能依赖 SW 运行时补救——而补救是"补丁式"的，见 B/C。

### B — `install` 预缓存严重不足（P0）
- **证据**：`public/sw.js:3` `ASSETS = ["/", "/manifest.json", "/icon.svg"]`。
- **问题**：仅首页壳 + manifest + 图标被 `install` 预缓存（`:12-18`）。**全部 JS chunk、CSS、字体、`/todos`、`/settings`、`/patient/*` 均未在 `install` 预缓存**。首次离线或任何"未在线访问过的路由"只能靠运行时 `cache-first` 命中，否则失败→白屏/报错。这正是"断网后应用不可用"的核心：离线打开病人详情时，该路由 HTML 根本不在缓存里。

### C — `patient-shell` 兜底的前提条件与失效场景（P0/P1）
- **机制**：预缓存不到 `/patient/*`，离线程径靠运行时播种：`app/page.tsx:47-57` 在 **prod 且 `patients.length>0`** 时 `fetch('/patient/首个id')`，由 `sw.js:46-53`/`92-95` 写入固定键 `patient-shell`（跨激活保留）。
- **失效场景（即用户报的"打开病人详情页报错/不可用"）**：
  1. **离线首开**（从未联网加载过）→ 无 `patient-shell` → 打开任意病人，`handleNavigate`（`sw.js:73-78`）回退到 `'/'` 首页壳 → 用户看到**首页**而非病人页，或与 URL `/patient/xxx` 的 hydration 不匹配报错。
  2. **种子 fetch 未完成/被中断/被缓存策略跳过** → 同上。
  3. **即使 shell 已存在**：点击 `<Link>` 触发 Next 客户端 **RSC 拉取**（带 `RSC` 头、`mode=cors`，走 `sw.js:83` `handleAsset`）→ 离线 `fetch` 失败 → 返回 `Response.error()`（`:98-100`）→ 客户端导航**先报错/空白闪**，再退化硬刷新由 shell 兜底 → 体验为"卡顿+报错"。
- **本质**：手写 SW 的 App Shell 思路 + 动态 SSR 路由，是"用补丁模拟 PWA"，无法为动态 `id` 提供稳定离线保证。

### D — `handleAsset` 对 RSC 的离线处理（P1）
- **证据**：`sw.js:83-101` 仅 `cache` `res.type==="basic"||"cors"`，且 `cache-first`；RSC payload 的缓存键是完整 URL，未知病人的 RSC 永不命中 → 离线客户端导航必失败（返回 `Response.error()` 而非 shell）。`activate`（`sw.js:24-38`）逻辑 OK（保留 `patient-shell`），但无法弥补 `install` 预缓存缺失。

### E — dev 不注册 SW（观察）
- **证据**：`components/Providers.tsx:122` `if (process.env.NODE_ENV !== "production") return;`（并主动注销旧 SW）。后果：**本地联调无法验证离线行为**，问题只在 prod 暴露，排查链路长。

---

## 3. 架构级建议

**推荐方案（P0 目标）：改为静态导出 `output: 'export'`，并配套离线策略。**

- `next.config.mjs` 增加 `output: 'export'`。
- `app/patient/[id]/page.tsx` 加 `generateStaticParams` 预渲染一个"通用壳"（如 `[{ id: '__shell__' }]`）；页面始终按 `useParams().id` 从 IndexedDB 取数（本就如此，数据不依赖路由参数）。
- 重写 `sw.js` 的 `install`，**预缓存完整资源**：`/`、`/todos`、`/settings`、`/patient/__shell__` + 全部构建产物（`/_next/static/*`）。推荐用 `next-pwa`/Workbox 生成 precache manifest，或用脚本扫描 `.next` 产物生成清单，而非手列 `ASSETS`。
- 离线任意 `/patient/*`：SW 在 `navigate` 分支把 `/patient/*` 统一映射到预缓存的 `__shell__`（或命中缓存壳）。数据全在 IndexedDB，**无任何 RSC 网络依赖** → 彻底离线可用，包括断网后新导入的病人。
- **代价**：失去 SSR/流式渲染；不能使用 API routes、`cookies`、`headers`、中间件等。本应用是纯客户端 + IndexedDB，**基本无影响**。动态 `id` 靠 SW 壳兜底（已论证可行）。收益远大于代价，且直接满足 PRD §15.1/§15.3。

**备选（保留 SSR 的止血方案，不推荐长期）**：SW `install` 预缓存完整资源清单 + 预缓存一个 patient 壳 + `next/link` 设 `prefetch={false}` 并对 `/patient/*` 改用 `location.href` 硬导航（绕过 RSC 拉取失败）。仍是补丁，脆弱，仅作过渡。

---

## 4. 优先级修复计划

### P0（立即，解决"卡顿主因 + 离线主因"）

**P0-1｜离线架构（根因 A/B/C）**
- 文件：`next.config.mjs`、`app/patient/[id]/page.tsx`、`public/sw.js`、`scripts/sync-version.mjs`。
- 做法：① `next.config.mjs` 加 `output: 'export'`；② 病人页加 `export function generateStaticParams(){ return [{id:'__shell__'}] }`，页面按 URL id 取数不变；③ 重写 `sw.js` `install` 预缓存全部静态路由 + `/_next/static/*`（引入构建期 precache 清单）；④ `navigate` 分支把 `/patient/*` 映射到预缓存壳，`handleAsset` 对 RSC/未知路径离线时回退壳而非 `Response.error()`。

**P0-2｜首页 memo 击穿止血（根因 P1）**
- 文件：`app/page.tsx`。
- 做法：用 `useCallback` 稳定 `openDetail`(`:181`)、`onMenu`(`:298`/`:309`，改为 `const onMenu = useCallback((p)=>setMenuPatient(p),[])` 并复用)、`onReminderClick`(`:185`)、`doDelete`(`:193`)、`setListDirection` 等所有传给 `memo` 组件的回调。**目标**：未受影响的单卡在 state 变化时跳过重渲染。

**P0-3｜收敛 useLiveQuery 雪崩 + 移出 getSettings 写回（根因 P2）**
- 文件：`lib/db.ts:170-185`、`components/Providers.tsx:74`、`app/page.tsx:36` 等。
- 做法：① 把 `getSettings` 内的 `db.settings.put` 迁移写回移出 querier（在 DB 初始化/`populate` 或首次访问时一次性执行），querier 只做读；② 首页/待办页避免重复订阅同一表；③ 评估 `NavBar` 是否可只取 badge 所需数据。

### P1（重要，解决次要卡顿与离线健壮性）

**P1-1｜分组卡 items 引用稳定化（根因 P3）**
- 文件：`app/page.tsx:91-116`（rows 计算）。
- 做法：按 `groupId` 缓存 `GroupedItem[]`，使某组底层病人数据未变时 `items` 引用不变；或把 `GroupedPatientCard` 内部自行用 `useMemo` 计算各病人的 `todoCount`/`status`，而非从父组件传全新数组。

**P1-2｜待办页 memo 击穿（根因 P4）**
- 文件：`app/todos/page.tsx`、`components/TodoListView.tsx`。
- 做法：`onToggle`/`onDelete`/`onOpen`/`passFilter` 用 `useCallback`/`useMemo`；`TodoListView` 视情况 `React.memo`。

**P1-3｜quick-todos Reorder 稳定 id（根因 P5）**
- 文件：`app/settings/quick-todos/page.tsx`、`types/index.ts`、`lib/db.ts`（`defaultQuickTodos`）。
- 做法：给 `QuickTodo` 增加 `id` 字段；`values`、`key`、`value` 全部改用 `qt.id`。

**P1-4｜SW 离线兜底强化（根因 D）**
- 文件：`public/sw.js`。
- 做法：`/patient/*` 导航统一映射预缓存壳；RSC/未知资源离线时回退壳而非 `Response.error()`；`install` 预缓存清单含全部路由与静态产物。

### P2（优化，按收益排）

- **P2-1 列表虚拟化**：当前代码**完全没有虚拟化**（grep 已确认）。对 >50 病人的病房，引入 `react-window` 或 `@tanstack/react-virtual` 窗口化首页列表与待办长列表，是消除滚动卡顿的关键补强（与 P0-2 配合）。
- **P2-2 `NavBar` 订阅收敛**：`NavBar.tsx:18` 取全量 `todos` 仅为 badge，每次 `todos` 变化重渲染整条底栏；可改为仅在挂载时取一次或细化选择器（影响小，后置）。
- **P2-3 `TodoListView` 的 `layout` 动画**：`TodoListView.tsx:56` 的 `layout` 在长列表勾选时会触发全部项 layout 重测量；可对长列表关闭 `layout` 或仅动画可见项。
- **P2-4 本地联调离线**：`Providers.tsx:122` 的 dev 不注册 SW 应保留，但建议增加"dev 下可用开关"以便在本地验证离线（避免只在 prod 暴露）。

---

## 5. 验证方式

**性能**
- Chrome DevTools → **Performance** 录制：关注① 勾选一个待办时，`HomePage → PatientCard×N` 的 re-render 数量（修复后应接近 1 或仅受影响的卡）；② 长列表滚动的 FPS / 帧时长。
- **React DevTools → Profiler**：看 `PatientCard`/`SwipeableTodo` 命中 `memo` 的比例（修复后应大幅上升）；开启 "Highlight updates" 直观对比修复前后整页高亮范围。
- **Lighthouse** → Performance 跑分对比。

**离线**
- DevTools → **Application → Service Workers** + **Network 勾选 Offline**（或设备模拟 Offline）。场景：
  1. 在线首开 → 切离线 → 刷新首页（应可用）；
  2. 在线打开过某病人 → 离线打开**另一**病人（应可用）；
  3. **完全离线首开** → 打开任意病人（修复前失败，修复后应可用）。
- DevTools → **Application → Cache Storage**：检查 `patient-shell`/预缓存清单是否含全部路由与 `/_next/static/*`。
- 验证 P0-1 后，场景 3 必须达标（PRD §15.3 硬性要求）。

**对照**
- 修复前后各录一段相同操作（勾一个待办 / 离线开病人），用 Performance + React Profiler 做 A/B 对比，作为回归基线。

---

## 6. 一句话结论

**卡顿** = "Dexie `useLiveQuery` 全局订阅 + 内联回调击穿 `React.memo`" → 一次写入雪崩式重渲染整页卡片；**离线不达标** = "SSR 动态路由 + 手写 SW 仅预缓存首页、靠运行时播种单一 `patient-shell` 兜底"这一架构级错配。两者都应在**架构层**一次性解决：**静态导出 `output:'export'` + `install` 预缓存完整资源 + 用 `useCallback`/`useMemo` 稳定引用与选择器**。
