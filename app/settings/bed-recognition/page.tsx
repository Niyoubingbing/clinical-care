"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronDown, Plus, X } from "lucide-react";
import { db, getSettings, updateSettings, updatePatient, uid } from "@/lib/db";
import { parseBed } from "@/lib/bed-parser";
import { computeBedType, isBedInRoundingOrder } from "@/lib/bed-type";
import { blockLabel, normalizeBeds } from "@/lib/rounding-edit";
import { BedType, Patient, RoundingBlock, RoundingConfig } from "@/types";
import { useApp } from "@/components/Providers";
import SubpageHeader from "@/components/SubpageHeader";

/** 「加入新建加床块」的伪块 id（下拉选项值）。 */
const NEW_EXTRA_BLOCK = "__new_extra__";

/** 床型徽标文案。 */
function bedTypeLabel(t: BedType): string {
  if (t === "real") return "病房床";
  if (t === "extra-real") return "真实加床";
  return "虚拟床";
}

/** 床型徽标样式（复用全局 badge 语义色）。 */
function bedTypeBadgeClass(t: BedType): string {
  if (t === "virtual") return "badge-virtual";
  if (t === "extra-real") return "badge-special";
  return "badge-muted";
}

export default function BedRecognitionPage() {
  const { toast } = useApp();
  const settings = useLiveQuery(() => getSettings(), []);
  const patientsQuery = useLiveQuery(() => db.patients.toArray(), []);
  const patients = useMemo(() => patientsQuery ?? [], [patientsQuery]);

  const [template, setTemplate] = useState("");
  const [marks, setMarks] = useState("");
  // 每个「未入列床号」在下拉里选择的目标块（key = bedNumber）。
  const [targetBlock, setTargetBlock] = useState<Record<string, string>>({});
  // 每个块的「添加床号」输入草稿（key = blockId）。
  const [bedDraft, setBedDraft] = useState<Record<string, string>>({});
  const [showParser, setShowParser] = useState(false);
  const [showOverrides, setShowOverrides] = useState(false);
  const [overrideDraft, setOverrideDraft] = useState("");

  // settings 来自异步 useLiveQuery，首帧为 undefined；useState 只取一次初值，
  // 必须在 settings 就绪后用 effect 同步，否则打开页面输入框为空、点「保存模板」会把已配置清空。
  useEffect(() => {
    if (settings) {
      setTemplate(settings.bedTemplate ?? "");
      setMarks((settings.specialMarks ?? []).join(", "));
    }
  }, [settings]);

  const tpl = settings?.bedTemplate ?? "";
  const mk = useMemo(() => settings?.specialMarks ?? [], [settings]);
  const config: RoundingConfig | undefined = settings?.roundingOrder;
  const blocks: RoundingBlock[] = useMemo(() => config?.blocks ?? [], [config]);
  const overrides: string[] = useMemo(
    () => settings?.virtualOverrides ?? [],
    [settings]
  );

  // 病人按床号稳定排序，避免 Dexie 返回顺序抖动导致列表跳动。
  const sortedPatients = useMemo(
    () => [...patients].sort((a, b) => a.bedNumber.localeCompare(b.bedNumber, "zh")),
    [patients]
  );

  /** 床号 → 所属块（用于展示「已入列」位置）。 */
  const blockOfBed = useMemo(() => {
    const m = new Map<string, RoundingBlock>();
    for (const b of blocks) {
      for (const bed of b.beds ?? []) {
        if (!m.has(bed)) m.set(bed, b);
      }
    }
    return m;
  }, [blocks]);

  const typeOf = (p: Patient): BedType =>
    computeBedType(p, config, overrides);

  /** 写回查房块（任何手工编辑都标记为自定义规则，与查房顺序页一致）。 */
  const saveBlocks = async (nextBlocks: RoundingBlock[], extraPatch?: { virtualOverrides?: string[] }) => {
    if (!config) return;
    await updateSettings({
      roundingOrder: { ...config, ruleType: "custom", blocks: nextBlocks },
      ...(extraPatch ?? {}),
    });
  };

  /** 把床号加入指定块（同时从其它块移除，保证床号只归属一个块）。 */
  const addBedToBlock = async (bedRaw: string, blockId: string) => {
    if (!config) return;
    const bed = bedRaw.trim();
    if (!bed) {
      toast({ message: "请输入床号" });
      return;
    }
    let nextBlocks: RoundingBlock[];
    if (blockId === NEW_EXTRA_BLOCK) {
      nextBlocks = [
        ...blocks.map(
          (b) => ({ ...b, beds: b.beds.filter((x) => x !== bed) }) as RoundingBlock
        ),
        { id: uid(), kind: "extra", beds: [bed] },
      ];
    } else {
      nextBlocks = blocks.map((b) => {
        if (b.id === blockId) {
          return {
            ...b,
            beds: normalizeBeds([...b.beds.filter((x) => x !== bed), bed]),
          } as RoundingBlock;
        }
        return { ...b, beds: b.beds.filter((x) => x !== bed) } as RoundingBlock;
      });
    }
    // 显式加入查房块时同步解除该床的「强制虚拟」，否则加入后仍显示虚拟床，令人困惑。
    const nextOverrides = overrides.filter((x) => x !== bed);
    await saveBlocks(
      nextBlocks,
      nextOverrides.length !== overrides.length
        ? { virtualOverrides: nextOverrides }
        : undefined
    );
    toast({ message: `${bed} 已加入查房列表` });
  };

  /** 把床号移出所有块（即变为虚拟床）。 */
  const removeBedFromBlocks = async (bed: string) => {
    if (!config) return;
    const nextBlocks = blocks.map(
      (b) => ({ ...b, beds: b.beds.filter((x) => x !== bed) }) as RoundingBlock
    );
    await saveBlocks(nextBlocks);
    toast({ message: `${bed} 已移出查房列表（虚拟床）` });
  };

  /** 强制虚拟名单增删（高级用法）。 */
  const toggleOverride = async (bedRaw: string) => {
    const bed = bedRaw.trim();
    if (!bed) return;
    const next = overrides.includes(bed)
      ? overrides.filter((x) => x !== bed)
      : [...overrides, bed];
    await updateSettings({ virtualOverrides: next });
    toast({
      message: overrides.includes(bed)
        ? `已取消 ${bed} 的强制虚拟`
        : `${bed} 已强制标为虚拟床`,
    });
  };

  /**
   * 按当前模板重算**展示字段**（病区 / 基础床号 / 特殊标记）。
   * 注意：bedType 不再来自解析模板，此处刻意不写 bedType，
   * 避免「改模板 → 病人被判虚拟床 → 首页隐藏」的历史缺陷。
   */
  const reparseAll = async () => {
    for (const p of patients) {
      const parsed = parseBed(p.bedNumber, tpl, mk);
      await updatePatient(p.id, {
        ward: parsed.ward,
        bedBase: parsed.bedBase,
        specialType: parsed.specialType,
      });
    }
    toast({ message: "已按当前模板重新解析（病区 / 床号 / 标记）" });
  };

  const saveTemplate = () => {
    try {
      new RegExp(template);
    } catch {
      toast({ message: "正则表达式无效" });
      return;
    }
    updateSettings({
      bedTemplate: template,
      specialMarks: marks
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    });
    toast({ message: "模板已保存（仅影响展示解析，不改变真实/虚拟）" });
  };

  const addRoomBlock = async () => {
    if (!config) return;
    await saveBlocks([...blocks, { id: uid(), kind: "room", beds: [] }]);
    toast({ message: "已添加病房块" });
  };

  const addExtraBlock = async () => {
    if (!config) return;
    await saveBlocks([...blocks, { id: uid(), kind: "extra", beds: [] }]);
    toast({ message: "已添加真实加床块" });
  };

  const removeBlock = async (blockId: string) => {
    if (!config) return;
    await saveBlocks(blocks.filter((b) => b.id !== blockId));
    toast({ message: "已删除块（块内床号变为虚拟床）" });
  };

  if (!settings) {
    return <div className="py-10 text-center text-muted">加载中…</div>;
  }

  const virtualPatients: Patient[] = sortedPatients.filter(
    (p) => !isBedInRoundingOrder(p, config)
  );

  return (
    <div className="space-y-5">
      <SubpageHeader
        title="床号识别"
        description="床号是否在查房列表里，决定它是真实床还是虚拟床。"
      />

      <p className="rounded-xl bg-surface-alt px-3 py-2.5 text-[12px] leading-relaxed text-muted">
        判定规则：床号出现在下方任一「病房块」→ 病房床；出现在「真实加床块」→
        真实加床；不在任何块里 → 虚拟床（首页可一键隐藏）。床号为精确匹配（区分大小写）。
      </p>

      {/* —— 1. 病人床型总览：直接加入 / 移出查房列表 —— */}
      <div>
        <p className="mb-2 px-1 text-[13px] font-medium text-muted">
          病人床型（{patients.length} 人 · 虚拟床 {virtualPatients.length} 人）
        </p>
        {patients.length === 0 && (
          <p className="rounded-xl bg-card/50 px-4 py-8 text-center text-[13px] text-muted">
            暂无病人
          </p>
        )}
        <div className="space-y-2">
          {sortedPatients.map((p) => {
            const t = typeOf(p);
            const owner = blockOfBed.get(p.bedNumber);
            const parsed = parseBed(p.bedNumber, tpl, mk);
            const forced = overrides.includes(p.bedNumber);
            const selected =
              targetBlock[p.bedNumber] ??
              (blocks.length > 0 ? blocks[0].id : NEW_EXTRA_BLOCK);
            return (
              <div key={p.id} className="card space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-main">
                      {p.bedNumber} · {p.name}
                    </p>
                    <p className="text-[12px] text-muted">
                      病区 {parsed.ward || "—"} · 床号 {parsed.bedBase || "—"}
                      {parsed.specialType ? ` · 标记 ${parsed.specialType}` : ""}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted">
                      {owner ? `所属：${blockLabel(owner)}` : "未在查房列表中"}
                      {forced ? " · 已强制虚拟" : ""}
                    </p>
                  </div>
                  <span className={bedTypeBadgeClass(t)}>{bedTypeLabel(t)}</span>
                </div>

                {owner ? (
                  <button
                    className="btn-secondary h-9 w-full text-[13px]"
                    onClick={() => removeBedFromBlocks(p.bedNumber)}
                  >
                    移出查房列表（变虚拟床）
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <select
                      className="min-w-0 flex-1 rounded-lg border border-border/60 bg-card px-2 py-2 text-[12px] text-main"
                      value={selected}
                      onChange={(e) =>
                        setTargetBlock((s) => ({
                          ...s,
                          [p.bedNumber]: e.target.value,
                        }))
                      }
                    >
                      {blocks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.kind === "extra" ? "加床块：" : "病房块："}
                          {blockLabel(b)}
                        </option>
                      ))}
                      <option value={NEW_EXTRA_BLOCK}>＋ 新建真实加床块</option>
                    </select>
                    <button
                      className="btn-primary h-9 shrink-0 px-3 text-[13px]"
                      onClick={() => addBedToBlock(p.bedNumber, selected)}
                    >
                      加入
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* —— 2. 查房块管理：床号增删即真实/虚拟切换 —— */}
      <div>
        <p className="mb-2 px-1 text-[13px] font-medium text-muted">
          查房列表（{blocks.length} 块）
        </p>
        {blocks.length === 0 ? (
          <p className="rounded-xl bg-card/50 px-4 py-6 text-center text-[13px] text-muted">
            暂无查房块，所有床号都会被判为虚拟床。点下方按钮添加。
          </p>
        ) : (
          <div className="space-y-2">
            {blocks.map((b) => {
              const isRoom = b.kind === "room";
              return (
                <div key={b.id} className="card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                          isRoom
                            ? "bg-primary/5 text-primary-hover dark:bg-primary/20 dark:text-[#f4aa8d]"
                            : "bg-warning/5 text-[#7a470f] dark:bg-warning/20 dark:text-[#f0bb72]"
                        }`}
                      >
                        {isRoom ? "病房块" : "真实加床块"}
                      </span>
                      <span className="truncate text-[12px] text-muted">
                        {blockLabel(b)}
                      </span>
                    </div>
                    <button
                      aria-label="删除块"
                      onClick={() => removeBlock(b.id)}
                      className="shrink-0 rounded-lg p-1.5 text-danger hover:bg-danger/10"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {b.beds.length === 0 && (
                      <span className="text-[12px] text-muted">尚无床号</span>
                    )}
                    {b.beds.map((bed) => (
                      <span
                        key={bed}
                        className="flex items-center gap-1 rounded-md bg-surface-alt px-2 py-1 text-[12px] text-main"
                      >
                        {bed}
                        <button
                          aria-label={`移出 ${bed}`}
                          onClick={() => removeBedFromBlocks(bed)}
                          className="text-muted hover:text-danger"
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="mt-2 flex gap-2">
                    <input
                      className="input h-9 flex-1 py-1 text-[13px]"
                      placeholder={isRoom ? "添加完整床号，如 309W44" : "如 309WJ04"}
                      value={bedDraft[b.id] ?? ""}
                      onChange={(e) =>
                        setBedDraft((s) => ({ ...s, [b.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        const v = bedDraft[b.id] ?? "";
                        if (!v.trim()) return;
                        addBedToBlock(v, b.id);
                        setBedDraft((s) => ({ ...s, [b.id]: "" }));
                      }}
                    />
                    <button
                      className="btn-secondary h-9 shrink-0 px-3"
                      onClick={() => {
                        const v = bedDraft[b.id] ?? "";
                        if (!v.trim()) {
                          toast({ message: "请输入床号" });
                          return;
                        }
                        addBedToBlock(v, b.id);
                        setBedDraft((s) => ({ ...s, [b.id]: "" }));
                      }}
                    >
                      <Plus size={15} /> 添加
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-2 flex gap-2">
          <button
            className="btn-secondary h-10 flex-1 whitespace-nowrap text-[13px]"
            onClick={addRoomBlock}
          >
            <Plus size={15} /> 添加病房块
          </button>
          <button
            className="btn-secondary h-10 flex-1 whitespace-nowrap text-[13px]"
            onClick={addExtraBlock}
          >
            <Plus size={15} /> 添加加床块
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-muted">
          块的顺序即查房顺序，可在「设置 → 查房顺序」拖拽调整。
        </p>
      </div>

      {/* —— 3. 床号解析（仅影响展示字段） —— */}
      <div className="rounded-xl border border-border/60 bg-card">
        <button
          onClick={() => setShowParser((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-[13px] font-medium text-primary"
        >
          床号解析（病区 / 床号 / 特殊标记，仅影响展示）
          <ChevronDown
            size={16}
            className={`transition ${showParser ? "rotate-180" : ""}`}
          />
        </button>
        {showParser && (
          <div className="space-y-3 border-t border-border/60 p-3">
            <p className="text-[12px] text-muted">
              解析结果只用于展示（病区、基础床号、特殊标记字母），
              <span className="text-main">不影响</span>真实 / 虚拟判定。
            </p>
            <div>
              <label className="mb-1 block text-[12px] text-muted">
                解析模板（正则，4 个分组：病区基底 / 方位 / 特殊标记 / 床号）
              </label>
              <input
                className="input font-mono text-[13px]"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-muted">
                特殊床标记（逗号分隔，如 J, YZ）
              </label>
              <input
                className="input"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary h-10 flex-1" onClick={saveTemplate}>
                保存模板
              </button>
              <button className="btn-primary h-10 flex-1" onClick={reparseAll}>
                重新解析全部
              </button>
            </div>
          </div>
        )}
      </div>

      {/* —— 4. 强制虚拟床（高级，极少数场景） —— */}
      <div className="rounded-xl border border-border/60 bg-card">
        <button
          onClick={() => setShowOverrides((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-[13px] font-medium text-primary"
        >
          强制标为虚拟床（高级 · {overrides.length}）
          <ChevronDown
            size={16}
            className={`transition ${showOverrides ? "rotate-180" : ""}`}
          />
        </button>
        {showOverrides && (
          <div className="space-y-3 border-t border-border/60 p-3">
            <p className="text-[12px] text-muted">
              极少数场景：某床号虽在查房列表里，但需要临时按虚拟床处理。
              强制名单优先级高于查房块匹配。
            </p>
            <div className="flex gap-2">
              <input
                className="input h-9 flex-1 py-1 text-[13px]"
                placeholder="输入完整床号后添加，如 309WJ04"
                value={overrideDraft}
                onChange={(e) => setOverrideDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  if (!overrideDraft.trim()) return;
                  toggleOverride(overrideDraft);
                  setOverrideDraft("");
                }}
              />
              <button
                className="btn-secondary h-9 shrink-0 px-3"
                onClick={() => {
                  if (!overrideDraft.trim()) {
                    toast({ message: "请输入床号" });
                    return;
                  }
                  toggleOverride(overrideDraft);
                  setOverrideDraft("");
                }}
              >
                <Plus size={15} /> 添加
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {overrides.length === 0 && (
                <span className="text-[12px] text-muted">暂无强制虚拟床</span>
              )}
              {overrides.map((bed) => (
                <span
                  key={bed}
                  className="flex items-center gap-1 rounded-md bg-surface-alt px-2 py-1 text-[12px] text-main"
                >
                  {bed}
                  <button
                    aria-label={`取消强制 ${bed}`}
                    onClick={() => toggleOverride(bed)}
                    className="text-muted hover:text-danger"
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
