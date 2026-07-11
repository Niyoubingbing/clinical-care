# Clinical Care PWA — 性能分析与优化方案

> 分析对象：https://clinical-care.vercel.app/ （Next.js 15 静态导出 PWA，IndexDB/Dexie 离线优先，无后端 API）
> 分析日期：2026-07-10
> 角色：Performance Benchmarker

---

## 0. 测量方法与限制（先说清楚）

- 沙箱内**无 Chrome/Lighthouse**，且对外网络受限（`curl` 探测线上站点失败），因此**无法在本地跑 Lighthouse 实测 CWV**。
- 替代基线来源：直接分析 `out/`（即部署产物）的 **JS/CSS 真实体积（raw + gzip）**，并审查源码与构建配置。这是确定性的、可复现的基线。
- 线上真实 CWV（LCP/INP/CLS）需通过 Vercel 仪表盘 Speed Insights / Lighthouse CI 在 CI 中采集——见方案 P2。

---

## 1. 📊 性能基线（来自 `out/` 构建产物）

| 指标 | 测量值 | 参考阈值 | 判定 |
|---|---|---|---|
| 首屏关键路径 JS（gzip，按路由） | **≈ 205 KB** | "Good" ≈ ≤ 170 KB | ⚠️ 偏高（约 +20%） |
| 全站 JS 总量（raw） | ≈ 1.14 MB（含 legacy polyfills） | — | — |
| 首屏 CSS（gzip） | ≈ 5 KB | — | ✅ 优秀 |
| Web 字体 | 无 | — | ✅ 无字体阻塞 |
| 最大单项共享 chunk | 169 KB raw / ~53 KB gz（React-DOM） | — | — |
| framer-motion 占比 | chunks 255+680 ≈ **81 KB gz** | — | 🔴 头号权重 |

**首屏 JS 组成（gzip 估算）：**
- React-DOM + scheduler：~53 KB
- **framer-motion（domMax 全集）：~81 KB** ← 仅次于 React，且被根组件/模板引入，**每条路由都在关键路径上**
- Dexie + dexie-react-hooks + lucide-react：~33 KB
- 业务代码 + polyfills(legacy，仅旧浏览器)：其余

---

## 2. 🔍 问题汇总（根因）

### P-1.【高】framer-motion 全量进入关键路径
- `framer-motion` 在 **根 `Providers`（`MotionConfig`）** 与 **`app/template.tsx`（包裹每条路由）** 被引入，外加 13 个组件使用 `motion.*`。
- 因此 ~81 KB gz 的动画库 **每条路由首屏都下载并解析**，是首屏 JS 超标的主因，也是 TBT/INP 的主要阻塞源。
- 其中真正用到的高级特性只有：`drag`（SwipeableTodo 滑动手势）、`Reorder`（3 个设置页拖拽排序）、`layout`/`exit` 过渡。`template` 的路由淡入其实只是简单 fade。

### P-2.【中】barrel 包未做按需 tree-shaking
- `lucide-react` 以具名导入方式使用，但未开启 `optimizePackageImports`，易带入冗余图标代码。
- `framer-motion` / `@tanstack/react-virtual` 同理，存在 tree-shaking 优化空间。

### P-3.【低】`pinyin-pro` 是死依赖
- `package.json` 仍声明 `pinyin-pro`，但**源码中无任何 import**（已验证：所有 chunk 中搜不到 pinyin 字典字符串 → 未打包）。
- 运行时零成本，但污染依赖树、增加 install 体积，应移除。

### P-4.【低】`out/` 存在孤儿 chunk
- `out/_next/static/chunks/main-f02b27bbbaf5105e.js`（119 KB raw）未被任何 HTML 引用 → 旧构建残留。
- `gen-sw-precache.mjs` 会 glob **整个 `out/`**，理论上孤儿 chunk 也会被预缓存。
- 干净重建（删除 `out/` 后重新 `next build`）即可消除；非代码缺陷。

### P-5.【监控缺失】无字段级 CWV 采集
- 未接入 RUM / Speed Insights，无法观测真实用户 LCP / INP / CLS，性能回归不可见。

### P-6.【缓存】静态资源缓存策略未显式固化
- `vercel.json` 未对 `/_next/static/**` 设置 `immutable` 长缓存，回访者可进一步优化。

---

## 3. 🎯 优化方案（分级，带工作量/风险/预期收益）

### ✅ P0 — 低风险的已草拟改动（建议保留并收尾）
> 以下三处我已草拟在本地（尚未构建验证、未提交），均为**行为保持型**改动：

1. **LazyMotion + `m.*` 化**（已草拟）
   - `Providers` 改为 `<LazyMotion features={domMax}><MotionConfig>…`，全站 `motion.div` → `m.div`。
   - 选 `domMax` 是因为 `drag`/`Reorder`/`layout` 需要完整特性集（用 `domAnimation` 会让滑动/排序失效）。
   - 收益：`m` 组件比 `motion` 轻、特性延迟解析，**降低首屏关键 JS 与主线程阻塞（TBT/INP）**；预计首屏 **−10~25 KB gz**。
   - 风险：低（UX 完全不变）。

2. **`optimizePackageImports`**（已草拟，next.config.mjs）
   - 对 `framer-motion` / `lucide-react` / `@tanstack/react-virtual` 开启按需导入。
   - 收益：lucide 收益最大，预计首屏 **−15~30 KB gz**。
   - 风险：低。

3. **移除死依赖 `pinyin-pro`**（已草拟，package.json）
   - 风险：零（未使用）。

**P0 合计预期：首屏 JS 205 KB gz → 约 150~180 KB gz（接近/达到 "Good" 阈值）。收尾动作：在 Vercel 重新构建以实测。**

### 🟡 P1 — 中等工作量/收益（需你确认是否纳入）
4. **替换 framer-motion 的手势与排序为原生实现（最大单项收益）**
   - `SwipeableTodo` 的 `drag` → 原生 Pointer Events（不依赖 FM）。
   - 3 个设置页的 `Reorder` → `@dnd-kit/sortable`（远轻于 FM Reorder）或自研指针拖拽。
   - 仅保留简单 `m.div` fade（或改为纯 CSS 过渡），可让 framer-motion 几乎清零。
   - 收益：首屏 **再 −60~80 KB gz**（接近 100 KB 级别下降）。
   - 风险：中（需重写并仔细回归你已调好的滑动/排序手感）。

5. **`vercel.json` 固化静态资源缓存**
   - 对 `/_next/static/**` 设 `Cache-Control: public, max-age=31536000, immutable`。
   - 收益：回访加载更快；风险：低。

6. **CLS 防守**
   - 对 `<img>`（若有）补 `width`/`height` 或 `aspect-ratio`，保证 CLS=0。

### 🔵 P2 — 长期/监控（建议但非本次阻塞）
7. **字段级 CWV 采集**：Vercel 仪表盘开启 Speed Insights（无需在沙箱装包）或加 `web-vitals` 上报。
8. **Lighthouse CI 预算门禁**：在部署流水线加 `lhci` 断言（LCP/INP/CLS 阈值），防止回归。
9. **路由级代码分割复查**：确认重型库仅进入需要它的 chunk。

---

## 4. 当前状态与下一步

- **已草拟未提交**：P0 的三处改动已在本地文件，但**尚未 `next build` 验证**（沙箱 bulk-delete 守卫拦截了构建；tsc/lint 被你中断）。
- **需要你确认**：是否按上述 P0 收尾并构建实测？是否进一步纳入 P1-#4（替换 FM 手势/排序）这一最大收益项？是否要我把已草拟改动**回退**只交付本报告？

> 在你确认前，我不会再做任何文件修改或构建。

---

**Performance Benchmarker**：Performance Testing Expert
**分析日期**：2026-07-10
**当前性能状态（基线）**：⚠️ 首屏 JS 超出 "Good" 阈值约 20%，Core Web Vitals 因无 Lighthouse 未能实测，结构上 LCP/CLS 风险低、INP/TBT 风险中等（受 205 KB JS 解析 + FM 影响）。
**可扩展性评估**：静态导出 + Vercel CDN，水平扩展无忧；瓶颈在**前端首屏体积**而非服务端。
