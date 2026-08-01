# 虚拟床显示开关失效 — 诊断报告

> 作者：齐活林（交付总监）｜ 日期：2026-07-30 ｜ 关联版本：v2.17.1（床型识别修复后用户实测仍无效）
> 性质：**纯诊断，未改动任何代码**。本文给出根因、影响范围与候选修复方案，待确认后实施。

---

## 一、问题现象

用户在 v2.17.1 上线后实测：「隐藏虚拟床」开关（`app/page.tsx` 首页「虚拟床：显示 / 隐藏」）**不起作用**——无论开还是关，首页列表不变化，仿佛功能未实现。

开关 UI 本身存在且渲染正常（`app/page.tsx:348-365` 无条件渲染，写 `updateSettings({ showVirtualBeds })`，持久化字段 `Settings.showVirtualBeds` 在 `types/index.ts:91`、默认值 `true` 在 `lib/db.ts:162`）。筛选纯函数 `filterHomeRows`（`lib/home-filter.ts:42-64`）也已实现。

→ 问题不在「开关有没有」，而在「开关切换后到底有没有床能被判为虚拟床并因此被隐藏」。

---

## 二、数据模型分析（回答：病人存了什么、床号外怎么标记）

### 2.1 Patient 实体字段（`types/index.ts:23-44`）

| 字段 | 含义 | 来源 |
|---|---|---|
| `id` | 主键 | 系统生成 |
| `bedNumber` | 床号（如 `309W01`） | 录入 |
| `name` / `diagnosis` | 姓名 / 诊断 | 录入 |
| `group` / `groupColor` | 自定义分组（解组/勇组/李组/王组…） | 录入 / 设置页维护 |
| `surgeryDate` | 手术日期 | 录入 |
| `dressingSchedule` | 每病人换药间隔覆盖 | 录入（不填继承全局） |
| `bloodTestDay` | 查血日 | 录入 |
| `ward` | 病区（如 `309W`） | **床号解析得到并持久化** |
| `room` | 归属病房（如 `309W41-43`） | 床号识别页手动填 |
| `bedBase` | 基础床号数值 | **床号解析得到并持久化** |
| `specialType` | 特殊标记字母（`J`/`YZ`） | **床号解析得到并持久化** |
| **`bedType`** | **床型：`real` / `extra-real` / `virtual`** | **床号解析得到并持久化** |
| `createdAt` / `updatedAt` | 时间戳 | 系统 |

> `dressingFrequency` / `lastDressingChange`（`:33-35`）已 `@deprecated`，不参与任何计算，仅保留以兼容旧导入/导出。

### 2.2 床型 / 虚拟怎么标记的

- **床型由 `bedType` 字段承载**（`real` / `extra-real` / `virtual`），本应作为「这张床是不是虚拟床」的唯一真相。
- `bedType` / `ward` / `bedBase` / `specialType` 都是 `parseBed(bedNumber, template, marks)` 的解析产物，经以下两处持久化：
  1. **床号识别页「重新解析全部」**（`app/settings/bed-recognition/page.tsx:30-42`：`reparseAll`）；
  2. **病人编辑页改床号时**（`components/PatientFormSheet.tsx:165-170` 编辑模式、`:300-312` 新增模式）。
- 床号识别页还提供**手动逐床覆盖**：`setType(id, bedType)`（`:61`、`:133`）可直接把某床写成 `virtual` 或 `extra-real`，写回 `p.bedType`。

---

## 三、系统默认配置（`lib/db.ts`）

- `bedTemplate = "^(\\d{3})([A-Z])([A-Z]{0,2})?(\\d{2})$"`（`:159`）→ 匹配 `309W01` / `309WJ04` 这类「数字+字母+数字」格式。
- `specialMarks = ["J", "YZ"]`（`:160`）→ 床号带 `J`/`YZ` 标记且匹配模板时判 `extra-real`（真实加床）。
- `showVirtualBeds = true`（`:162`）→ 默认显示虚拟床。
- `ensureSettingsMigrated`（`:203-209`）对存量数据回补 `showVirtualBeds` 默认值。
- **种子只种 `settings`（含查房顺序那串 `309Wxx` 序列，`defaultRoundingConfig()` 在 `:41-86`），并不种任何病人**。`309Wxx` 是「查房顺序模板」，不是病人记录。因此用户列表里的病人全部是自行录入，床型由录入的床号经模板解析决定。

---

## 四、根因分析

开关失效是**两个互相叠加的代码缺陷**导致的，而非开关本身缺失。

### Bug A — 首页筛选完全无视 `p.bedType`，只按床号重新解析

`lib/home-filter.ts:48-50`：

```ts
const isVirtual = (p: Patient): boolean =>
  parseBed(p.bedNumber, settings?.bedTemplate, settings?.specialMarks)
    .bedType === "virtual";
```

→ 判定只看 `parseBed(bedNumber).bedType`，**不读数据库里存好的 `p.bedType`**。
→ 后果：在床号识别页把一个床手动标成「虚拟床」（`p.bedType = "virtual"` 已落库），首页仍按床号重算判成 `real`，开关**不藏它**。

### Bug B — 病人编辑页保存时覆盖 `bedType`，抹掉手动虚拟标记

`components/PatientFormSheet.tsx:167-170`（编辑模式）、`:309-312`（新增模式）：

```ts
patch.ward = parsed.ward;
patch.bedBase = parsed.bedBase;
patch.bedType = parsed.bedType;   // 无条件用模板解析结果覆盖
patch.specialType = parsed.specialType;
```

→ 只要用户改过任何字段（含非床号字段触发保存），`bedType` 就被模板重算结果覆盖。手动标的「虚拟」被悄悄翻回「真实」。

### 叠加效应 — 默认数据本就没有虚拟床

默认模板 `^(\d{3})([A-Z])([A-Z]{0,2})?(\d{2})$` 正好匹配用户录入的 `309W01` 系列 → 全部解析为 `real` / `extra-real`，**一个 `virtual` 都没有**。
- 即便 Bug A/B 修好，若用户从未手动标虚拟床，关开关仍无床可藏（这是正确的——确实没有虚拟床）。
- 但用户**想**把某些床（加床/临时床/非标床）设为虚拟并隐藏时，Bug A 让手动标记无效、Bug B 让标记被编辑抹除 → 开关永远「没反应」。

> 一句话根因：**`bedType` 这个「虚拟床标记」字段被造出来存了，但既不被首页筛选使用（Bug A），又被编辑悄悄抹掉（Bug B）；而默认模板又让常规床号全判成真实床，于是开关成了摆设。**

---

## 五、影响范围

- **功能**：首页「隐藏虚拟床」开关对全部用户实际无效（除非床号恰好不匹配模板 → 那种情况会「关开关时整列消失」，同样是错误表现）。
- **数据一致性**：`p.bedType` 与床号解析结果可能长期不一致（手动标 virtual 后，一旦编辑又被覆盖），卡片徽标（`app/patient/page.tsx`、`PatientCard.tsx` 用 `parseBed(...).bedType`）也不显示手动虚拟。
- **已测试项**：`tests/virtual-bed.test.ts` 只验证了 `filterHomeRows` 在「传入已是 virtual 的 `p.bedType` 也被忽略、纯靠 bedNumber 解析」下的行为，未覆盖「手动 `p.bedType='virtual'` 应被尊重」的场景，故原测试全绿但真实缺陷漏网。

---

## 六、候选修复方案

### 方案 A（推荐）：让 `bedType` 成为床型唯一真相来源

核心原则：**首页读 `p.bedType`，模板解析只作为「填充/重算」手段，不绕过手动标记**。

改动点：
1. `lib/home-filter.ts:48-50` —— `isVirtual` 改为：
   ```ts
   const isVirtual = (p: Patient): boolean =>
     p.bedType === "virtual" ||
     parseBed(p.bedNumber, settings?.bedTemplate, settings?.specialMarks)
       .bedType === "virtual";
   ```
2. `components/PatientFormSheet.tsx:169`、`:311` —— 保存时保留手动虚拟，不向下覆盖：
   ```ts
   patch.bedType = p.bedType === "virtual" ? "virtual" : parsed.bedType;
   ```
   （`p` 为编辑前对象；新增模式本无旧值，直接用 `parsed.bedType` 即可。）
3. 卡片展示一致性（`app/page.tsx` 的 `bedInfoMap`、`app/patient/page.tsx` 虚拟徽标）：虚拟判定同样取 `p.bedType === "virtual" || parsed.bedType === "virtual"`，让徽标与开关行为一致。
4. `tests/virtual-bed.test.ts` 增补：手动 `p.bedType="virtual"` 且床号匹配模板时，开关关 → 该床被隐藏。

优点：贴合用户「能标记虚拟床并隐藏」的诉求；模板对非标床号的自动归类保留；手动标记与自动解析共存。
风险：低。需确认「重新解析全部」（`reparseAll`）的语义——当前它已 `p.bedType === "virtual" ? "virtual" : parsed.bedType`（`:37`）保留 virtual，与方案 A 一致，无需改。

### 方案 B：保持纯模板自动，仅当床号不匹配模板才算 virtual

- 首页仍只按 `parseBed(bedNumber).bedType` 判定（即维持 Bug A 现状），不读 `p.bedType`。
- 优点：改动最小（甚至可能「无需改」，因为代码本就如此）。
- 缺点：用户录入的 `309Wxx` 全匹配模板 → **默认没有虚拟床，开关依旧无反应**；手动标虚拟床也无效。与用户诉求相悖，**不推荐**。

### 方案 C：把真实加床（`extra-real`，如 `309WJxx`）也算虚拟、可隐藏

- 把 `extra-real` 纳入可隐藏范围。
- 缺点：**直接违反 v2.17.1 既定约定「病房床 + 真实加床 = 真实床」**。会改变现有语义、影响查房顺序中加床块的展示，**不推荐**。

---

## 七、建议

采用 **方案 A**。它用最小改动（2 处核心逻辑 + 展示一致性 + 测试）修掉 Bug A/B，让「床号识别页手动标虚拟床 → 首页开关隐藏」这条主路径真正跑通，同时保留模板对非标床号的自动归类。方案 B/C 均与用户真实诉求或既有约定冲突。

---

## 八、验证方法（实施后）

1. **单元**：`tests/virtual-bed.test.ts` 增补用例
   - 给定 `p.bedType="virtual"` 且 `bedNumber="309W01"`（匹配模板），`showVirtualBeds=false` → 该床被剔除；`showVirtualBeds=true` → 保留。
   - 回归既有 3 例（不匹配模板→virtual、组内任一 virtual→整组剔除、true 全保留）。
2. **手测路径**
   - 床号识别页把某床标「虚拟床」→ 回首页关闭「隐藏虚拟床」→ 该床消失；打开 → 恢复。
   - 编辑该虚拟床（改诊断/姓名等）→ 保存 → 回首页确认仍被隐藏（验证 Bug B 修复）。
   - 新增一张床号非 `309Wxx` 格式的床（如 `ICU-5`）→ 默认即为 virtual → 关闭开关自动隐藏（验证模板自动归类仍在）。
3. **构建**：`npm run build` 零错误 + `vitest` 全绿。

---

## 九、实证验证（模拟批量导入，观察落库数据结构）

> 为验证根因，直接把真实 `parseBed` + `applyRoster` 映射逻辑（`lib/batch-import.ts:100-110`）跑在 4 类典型花名册上，打印每个病人落库后的 `bedType` 等字段。结论：**开关是否有用，完全取决于用户真实床号格式是否匹配模板**——而无论哪种情况，都无法隐藏「用户指定的某张床」。

### 模拟结果

**场景 1：花名册 `309Wxx`（数字开头，匹配默认模板）**
```
床号=309W01  | bedType=real       | ward=309W | ... 张三
床号=309W02  | bedType=real       | ward=309W | ... 李四
床号=309WJ01 | bedType=extra-real | ward=309W | special=J | 王五
床号=309WYZ02| bedType=extra-real | ward=309W | special=YZ| 赵六
床号=309W03  | bedType=real       | ward=309W | ... 钱七
→ 分布 {real:3, extra-real:2} | 虚拟床数: 0 | 关掉开关时将被隐藏: 0 人
```
→ **开关是摆设**：标准数据下根本不产生虚拟床，关掉开关毫无反应。**这极可能就是你遇到的真实情况。**

**场景 2：花名册 `W309xx`（字母开头，不匹配默认模板 `^(\d{3})...`）**
```
床号=W30901 | bedType=virtual | 张三
床号=W30902 | bedType=virtual | 李四
床号=W309J01| bedType=virtual | 王五（注：J 标记因整体不匹配模板而从未被识别）
→ 分布 {virtual:3} | 虚拟床数: 3 | 关掉开关时将被隐藏: 3 人（=全部）
```
→ 开关反向失效：所有床都变虚拟，**关掉开关直接把所有病人藏光**，无法只藏某几张。

**场景 3：混杂非标床号（加床/临时床/房间号/空）**
```
床号=309W01   | bedType=real    | 张三
床号=加床12     | bedType=virtual | 李四
床号=临时床A     | bedType=virtual | 王五
床号=41-43    | bedType=virtual | 赵六
床号=10-1     | bedType=virtual | 钱七
床号=(空)      | bedType=virtual | 孙八
→ 分布 {real:1, virtual:5} | 关掉开关时将被隐藏: 5 人
```
→ 开关「能藏」，但藏的是**所有非标床号**，不是用户挑的那张；且 `W309J01` 这类带 J 的真实加床被误判虚拟（模板不匹配→special 永不触发）。

**场景 4：自定义模板改为字母开头 `^([A-Z])(\d{3})(\d{2})$`**
```
床号=W30901  | bedType=real    | ward=W309 | 张三
床号=W309J1  | bedType=virtual | ward= | 李四（J 被吃进 bedBase 组，special 为空）
床号=309W01  | bedType=virtual | ward=309W | 王五
→ 分布 {real:1, virtual:2}
```
→ 模板与床号格式强耦合、相当脆弱；换模板后旧数据语义全乱。

### 实证结论（强化根因）
1. **标准数据下虚拟床数为 0** → 开关关掉无反应（场景 1）。这是默认 `309Wxx` 录入下的必然结果，与用户报「开关没实现」完全吻合。
2. **`bedType` 在导入阶段 100% 由床号解析决定**（`applyRoster` 写死 `bedType: parsed.bedType`），导入界面没有「虚拟床」手动入口 → 唯一能造出虚拟床的途径是「床号不匹配模板」或「床号识别页手动标」。
3. **手动标的虚拟床被无视/覆盖**（Bug A `home-filter.ts:48-50` 不读 `p.bedType`；Bug B `PatientFormSheet.tsx:169/311` 编辑时覆盖）→ 即便用户在床号识别页标了虚拟，开关也不藏它。
4. **当前架构下，开关永远无法隐藏「用户指定的某张床」**——它要么藏「全部非标床号」（场景 3），要么藏「全部/零张」（场景 1/2）。这正是用户想要却得不到的能力。

→ 实证结果**支持方案 A**：让 `bedType` 成为唯一真相来源、尊重床号识别页的手动虚拟标记，才能把开关变成「藏我挑的那张床」的可用功能。

---

## 十、用户澄清的权威业务规则（推翻正则模板模型）

用户明确：**「只有在查房列表（查房顺序）里面，被分配房间和真实加床，这些才是真实床，其他都是虚拟床。」**

映射到现有数据模型（`types/index.ts:70-79` 的 `RoundingBlock` / `RoundingConfig`）：
- 查房顺序 = `settings.roundingOrder.blocks`（有序块序列，顺序即查房顺序）。
- `kind: "room"` 块的 `beds` = 已分配房间的物理病床 → **真实床**。
- `kind: "extra"` 块的 `beds` = 真实加床 → **真实床**。
- 床号**不在任何块的 `beds` 里** = 不在查房列表 = **虚拟床**。

→ 权威规则（纯函数）：
```ts
computeBedType(bedNumber, roundingOrder): BedType {
  for (const block of roundingOrder.blocks) {
    if (block.kind === "extra" && block.beds.includes(bedNumber)) return "extra-real";
    if (block.kind === "room"  && block.beds.includes(bedNumber)) return "real";
  }
  return "virtual";
}
```

**这揭示 v2.17.1 的根因比 Bug A/B 更根本**：`bedType` 从来没按这条业务规则算过。
- `parseBed` 用「床号匹配正则模板」定 real/virtual，而正则模板**不编码「是否在查房列表」这个真条件**。
- 标准床号 `309Wxx` 匹配模板 → 全 real → 0 虚拟 → 开关无反应（与实证场景 1 完全吻合）。
- 即便在床号识别页手动标 virtual，`home-filter` 用 `parseBed` 重算又把标准床号判回 real（Bug A），编辑又覆盖（Bug B）。

→ 开关真正能用的修法，是**让 `bedType` 的唯一真相来源变成 `roundingOrder` 成员判定**，而非正则模板、也非手动标记。

### 方案 A'（建议，取代原方案 A）

1. **新增 `lib/bed-type.ts`**：`computeBedType(bedNumber, roundingOrder)`（纯函数，可单测）。`ward`/`bedBase`/`specialType` 仍由 `parseBed` 解析，但**只用于展示，不再决定 `bedType`**。
2. **`lib/home-filter.ts`**：`isVirtual(p, settings)` 改为 `computeBedType(p.bedNumber, settings.roundingOrder) === "virtual"`。开关立即反映查房列表变化，不再依赖存储的 `p.bedType`，Bug A 自然消失。
3. **`lib/batch-import.ts` `applyRoster`**：写 `bedType: computeBedType(row.bedNumber, roundingOrder)`（取代 `parseBed(...).bedType`）。
4. **`components/PatientFormSheet.tsx`**：保存时 `bedType: computeBedType(bedNumber, roundingOrder)`；删除「无条件覆盖手动 virtual」逻辑（Bug B 一并消失）。
5. **床号识别页重构方向**：现有「手动标 virtual / 重新解析全部」基于正则模板，与权威规则冲突。建议改为「管理查房列表块」——把床加进 room/extra 块即变真实、移出即变虚拟；`reparseAll` 改用 `computeBedType`。现有「逐床标 virtual」下拉可保留为**强制覆盖**（仅把查房列表内的床强制视为虚拟的极少数场景），默认折叠不展示。
6. **测试**：`tests/bed-type.test.ts` 覆盖——床号在 room 块→real、在 extra 块→extra-real、不在任何块→virtual、查房列表编辑后实时生效。

优点：根因级修复，开关从此真正可用（改查房列表即控真实/虚拟）；与用户权威规则 100% 一致；模板仅用于展示解析，职责清晰。
待定：① 床号精确匹配语义（大小写、`309W41-1` 子床号是否算在块内 `309W41`）；② 床号识别页做「管理查房块」重构，还是最小改动（仅改 `reparseAll` + 保留手动覆盖）。

---

## 十一、待用户确认

- 是否采用方案 A'（用 `roundingOrder` 成员判定取代正则模板来定 `bedType`）？
- 待定 ①：床号精确匹配语义——`309W41` 与 `309W41-1`（子床号）算同一张床吗？大小写是否归一？
- 待定 ②：床号识别页做「管理查房块」重构，还是最小改动（仅改 `reparseAll` 走 `computeBedType` + 保留手动覆盖）？
- 卡片虚拟徽标是否随方案 A' 一并改为读 `computeBedType`？（建议是，保证开关与徽标一致）
- 是否要把本报告同步进 `PRD.md` 变更日志与 `docs/system_design.md`（建议实施完成后一并更新，版本号拟升 `2.17.2`）。
