"use client";

import { useEffect, useRef, useState } from "react";
import { Reorder, useDragControls, type DragControls } from "framer-motion";
import {
  GripVertical,
  X,
  Plus,
  RotateCcw,
  Copy,
  ChevronDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { getSettings, defaultRoundingConfig, db } from "@/lib/db";
import { saveRoundingConfig } from "@/lib/rounding-settings";
import {
  basicRuleFromCounts,
  exportConfigText,
  importConfigText,
  isFullBed,
} from "@/lib/rounding-edit";
import { RoundingConfig, RoundingBlock } from "@/types";
import { useApp } from "@/components/Providers";
import SubpageHeader from "@/components/SubpageHeader";
import BedPlacementPanel from "@/components/BedPlacementPanel";
import { bedKey, normalizeBedNumber } from "@/lib/bed-number";
import ConfirmDialog from "@/components/ConfirmDialog";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export default function RoundingPage() {
  const { toast } = useApp();
  const patients = useLiveQuery(() => db.patients.toArray(), []);
  const settings = useLiveQuery(() => getSettings(), []);
  const [config, setConfig] = useState<RoundingConfig | null>(null);
  const [basicCount, setBasicCount] = useState(40);
  const [basicAvg, setBasicAvg] = useState(3);
  const [showIO, setShowIO] = useState(false);
  const [ioText, setIoText] = useState("");
  const currentConfig = useRef<RoundingConfig | null>(null);
  const persisted = useRef<RoundingConfig | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const failed = useRef(false);
  const [saveState, setSaveState] = useState("已保存");
  const [replacement, setReplacement] = useState<RoundingConfig | null>(null);

  // 仅初始化一次：从 DB 读取（已迁移），缺失则回填。
  useEffect(() => {
    if (!settings || pending.current || failed.current) return;
    const c = settings.roundingOrder;
    setConfig(c);
    currentConfig.current = c;
    persisted.current = c;
    if (c.regularBedCount) setBasicCount(c.regularBedCount);
    if (c.avgBedsPerRoom) setBasicAvg(c.avgBedsPerRoom);
  }, [settings]);

  if (!config) return <div className="py-10 text-center text-muted">加载中…</div>;

  const save = (next: RoundingConfig) => {
    if (failed.current) { toast({ message: "请先重新载入已保存的路线，再继续调整" }); return; }
    if (JSON.stringify(next) === JSON.stringify(currentConfig.current)) return;
    currentConfig.current = next;
    setConfig(next);
    pending.current++;
    setSaveState("保存中…");
    queue.current = queue.current.then(async () => {
      if (failed.current || !persisted.current) return;
      await saveRoundingConfig(persisted.current, next);
      persisted.current = next;
    }).catch(error => {
      failed.current = true;
      toast({ message: error instanceof Error ? error.message : "保存失败，请重新载入后重试" });
    }).finally(() => {
      pending.current--;
      if (!pending.current) setSaveState(failed.current ? "未保存，请重新载入" : "已保存");
    });
  };

  // 任意病房块/床号/加床的编辑都视为自定义。
  const updateBlock = (id: string, patch: Partial<RoundingBlock>) => {
    save({
      ...currentConfig.current!,
      ruleType: "custom",
      blocks: currentConfig.current!.blocks.map((b) =>
        b.id === id ? ({ ...b, ...patch } as RoundingBlock) : b
      ),
    });
  };
  const removeBlock = (id: string) =>
    save({ ...currentConfig.current!, ruleType: "custom", blocks: currentConfig.current!.blocks.filter((b) => b.id !== id) });

  const onReorder = (ids: string[]) => {
    const byId = new Map(currentConfig.current!.blocks.map((b) => [b.id, b]));
    const next = ids
      .map((id) => byId.get(id))
      .filter((b): b is RoundingBlock => Boolean(b));
    save({ ...currentConfig.current!, ruleType: "custom", blocks: next });
  };

  // 规则态切换
  const switchRule = (rule: RoundingConfig["ruleType"]) => {
    if (rule === "default") {
      setReplacement(defaultRoundingConfig());
      return;
    }
    if (rule === "basic") {
      // Opening the generator must not erase the saved route.
      save({
        ruleType: "basic",
        regularBedCount: basicCount,
        avgBedsPerRoom: basicAvg,
        blocks: config.blocks,
      });
      return;
    }
    save({ ...config, ruleType: "custom" });
  };

  const generateBasic = () => {
    const count = Math.min(2000, Math.max(1, Math.floor(basicCount) || 1));
    const avg = Math.min(200, Math.max(1, Math.floor(basicAvg) || 1));
    setReplacement({
      ruleType: "basic",
      regularBedCount: count,
      avgBedsPerRoom: avg,
      blocks: basicRuleFromCounts(count, avg),
    });
  };

  const addRoom = () =>
    save({
      ...config,
      ruleType: "custom",
      blocks: [...currentConfig.current!.blocks, { id: crypto.randomUUID(), kind: "room", beds: [] }],
    });
  const addExtra = () =>
    save({
      ...config,
      ruleType: "custom",
      blocks: [...currentConfig.current!.blocks, { id: crypto.randomUUID(), kind: "extra", beds: [] }],
    });

  const copyExport = async () => {
    const text = exportConfigText(config);
    try {
      await navigator.clipboard.writeText(text);
      toast({ message: "配置已复制" });
    } catch {
      setIoText(text);
      setShowIO(true);
      toast({ message: "已填入下方文本框，请手动复制" });
    }
  };
  const doImport = () => {
    const parsed = importConfigText(ioText);
    if (!parsed) {
      toast({ message: "导入失败：文本格式不正确" });
      return;
    }
    save(parsed);
    toast({ message: "配置已载入，请确认下方保存状态" });
  };

  const ruleType = config.ruleType;

  return (
    <div className="space-y-5">
      <SubpageHeader
        title="查房顺序"
        description="设置病房块、加床和实际查房路线。"
        action={
          <button
            onClick={() => {
              setReplacement(defaultRoundingConfig());
            }}
            className="flex h-10 items-center gap-1 rounded-[10px] border border-border/10 bg-card px-2.5 text-[12px] text-muted"
          >
            <RotateCcw size={15} /> 恢复
          </button>
        }
      />

      <div className="flex items-center justify-between text-[12px] text-muted"><span role="status">{saveState}</span>{failed.current && <button className="btn-secondary h-10" onClick={() => { if (settings && !pending.current) { failed.current = false; currentConfig.current = settings.roundingOrder; persisted.current = settings.roundingOrder; setConfig(settings.roundingOrder); setSaveState("已保存"); } }}>重新载入</button>}</div>
      <ConfirmDialog open={!!replacement} title="替换当前查房路线？" message="当前病房块、加床块和手动顺序将被替换。病人和待办不会删除。" confirmText="确认替换" onCancel={() => setReplacement(null)} onConfirm={() => { if (replacement) save(replacement); setReplacement(null); }} />

      {/* 规则态三态 */}
      <div className="grid grid-cols-3 gap-2">
        {(["default", "basic", "custom"] as const).map((r) => (
          <button
            key={r}
            onClick={() => switchRule(r)}
            className={`rounded-xl py-2.5 text-[13px] font-medium transition active:scale-[0.97] ${
              ruleType === r
                ? "bg-primary text-white"
                : "bg-card border border-border/60 text-muted"
            }`}
          >
            {r === "default" ? "默认规则" : r === "basic" ? "基础规则" : "自定义"}
          </button>
        ))}
      </div>
      <p className="text-[12px] text-muted">
        {ruleType === "default" && "内置示范（309W01 系列），以基础规则同款块样式展示，可调整。"}
        {ruleType === "basic" && "仅基础床号（01、02…），由普通病床数 ÷ 平均病房床数推导病房块。"}
        {ruleType === "custom" && "已手动修改内置规则，当前为自定义规则。"}
      </p>

      {/* 基础规则向导 */}
      {ruleType === "basic" && (
        <div className="space-y-2 rounded-xl border border-border/60 bg-card p-3">
          <p className="text-[12px] font-medium text-primary">基础规则设置</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[12px] text-muted">
              普通病床数量
              <input
                type="number"
                min={1}
                max={2000}
                className="input mt-1 w-full py-2 text-[14px]"
                value={basicCount}
                onChange={(e) => setBasicCount(Number(e.target.value || 1))}
              />
            </label>
            <label className="text-[12px] text-muted">
              平均单一病房床数
              <input
                type="number"
                min={1}
                max={200}
                className="input mt-1 w-full py-2 text-[14px]"
                value={basicAvg}
                onChange={(e) => setBasicAvg(Number(e.target.value || 1))}
              />
            </label>
          </div>
          <p className="text-[11px] text-muted">
            病房数 = ceil(普通病床数 ÷ 平均病房床数)，块内基础床号连续、可增删。
          </p>
          <button className="btn-primary h-10 w-full" onClick={generateBasic}>
            生成病房块
          </button>
        </div>
      )}

      {settings && <BedPlacementPanel config={config} settings={settings} patients={patients || []} onChange={save} onError={message => toast({ message })} />}

      {/* 块列表 */}
      <div className="subpage-section-heading">
        <div>
          <h2>查房块</h2>
          <p>拖动调整顺序，块内可继续编辑床号。</p>
        </div>
        <span className="subpage-section-count">{config.blocks.length} 块</span>
      </div>
      {config.blocks.length === 0 ? (
        <p className="rounded-lg bg-surface-alt px-3 py-3 text-[12px] text-muted">
          {ruleType === "basic"
            ? "填入上方数量并点「生成病房块」，或直接添加病房块手动编辑。"
            : "暂无病房块，点击下方按钮添加。"}
        </p>
      ) : (
        <Reorder.Group
          axis="y"
          values={config.blocks.map((b) => b.id)}
          onReorder={onReorder}
          className="space-y-2"
        >
          {config.blocks.map((b, index) => (
            <BlockCard
              key={b.id}
              block={b}
              onUpdate={(patch) => updateBlock(b.id, patch)}
              onRemove={() => removeBlock(b.id)}
              index={index}
              total={config.blocks.length}
              onMove={delta => { const ids = currentConfig.current!.blocks.map(block => block.id); const next = index + delta; if (next >= 0 && next < ids.length) { [ids[index], ids[next]] = [ids[next], ids[index]]; onReorder(ids); } }}
            />
          ))}
        </Reorder.Group>
      )}

      <div className="flex gap-2 pt-1">
        <button className="btn-secondary h-11 min-w-0 flex-1 whitespace-nowrap px-2 text-[12px] sm:text-[14px]" onClick={addRoom}>
          <Plus size={16} /> 添加病房块
        </button>
        <button className="btn-secondary h-11 min-w-0 flex-1 whitespace-nowrap px-2 text-[12px] sm:text-[14px]" onClick={addExtra}>
          <Plus size={16} /> 添加真实加床块
        </button>
      </div>

      {/* 导入 / 导出 */}
      <div className="rounded-xl border border-border/60 bg-card">
        <button
          onClick={() => setShowIO((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-[13px] font-medium text-primary"
        >
          导入 / 导出（可复制文本）
          <ChevronDown
            size={16}
            className={`transition ${showIO ? "rotate-180" : ""}`}
          />
        </button>
        {showIO && (
          <div className="space-y-2 border-t border-border/60 p-3">
            <div className="flex gap-2">
              <button className="btn-secondary h-10 flex-1" onClick={copyExport}>
                <Copy size={16} /> 复制当前配置
              </button>
            </div>
            <textarea
              className="input min-h-[120px] py-2 text-[12px] font-mono"
              placeholder="粘贴导出的查房顺序 JSON，然后点「导入」"
              value={ioText}
              onChange={(e) => setIoText(e.target.value)}
            />
            <button className="btn-primary h-10 w-full" onClick={doImport}>
              导入并应用
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DragHandle({ controls }: { controls: DragControls }) {
  return (
    <button
      type="button"
      onPointerDown={(e) => controls.start(e)}
      aria-label="拖拽排序"
      className="mt-1 shrink-0 cursor-grab touch-none select-none text-muted active:cursor-grabbing"
    >
      <GripVertical size={18} />
    </button>
  );
}

function BlockCard({
  block,
  onUpdate,
  onRemove,
  index,
  total,
  onMove,
}: {
  block: RoundingBlock;
  onUpdate: (patch: Partial<RoundingBlock>) => void;
  onRemove: () => void;
  index: number;
  total: number;
  onMove: (delta: number) => void;
}) {
  const controls = useDragControls();
  const { toast } = useApp();
  const [draft, setDraft] = useState("");

  const isRoom = block.kind === "room";
  const ward = block.kind === "room" ? block.ward : undefined;

  const addBed = () => {
    const raw = normalizeBedNumber(draft);
    if (!raw) return;
    let bed: string;
    if (isRoom) {
      if (/^\d+$/.test(raw)) bed = ward ? `${ward}${pad2(Number(raw))}` : pad2(Number(raw));
      else if (isFullBed(raw)) bed = raw;
      else { toast({ message: "普通床请填写数字或完整床号；J04 请加入加床块" }); return; }
    } else {
      bed = raw;
    }
    if (block.beds.some(value => bedKey(value) === bedKey(bed))) { toast({ message: "此块已有相同床号" }); return; }
    onUpdate({ beds: [...block.beds, bed] });
    setDraft("");
  };

  const removeBed = (bed: string) =>
    onUpdate({ beds: block.beds.filter((b) => b !== bed) });

  return (
    <Reorder.Item
      value={block.id}
      dragListener={false}
      dragControls={controls}
      className="card flex items-start gap-2 p-3"
      data-testid="rounding-block"
    >
      <div className="flex flex-col items-center"><DragHandle controls={controls} /><button aria-label={`上移第 ${index + 1} 块`} disabled={index === 0} onClick={() => onMove(-1)} className="flex h-10 w-8 items-center justify-center text-muted disabled:opacity-30"><ArrowUp size={15} /></button><button aria-label={`下移第 ${index + 1} 块`} disabled={index === total - 1} onClick={() => onMove(1)} className="flex h-10 w-8 items-center justify-center text-muted disabled:opacity-30"><ArrowDown size={15} /></button></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
              isRoom
                ? "bg-primary/5 text-primary-hover dark:bg-primary/20 dark:text-[#f4aa8d]"
                : "bg-warning/5 text-[#7a470f] dark:bg-warning/20 dark:text-[#f0bb72]"
            }`}
          >
            {isRoom ? "病房块" : "真实加床块"}
          </span>
          {isRoom && ward && <span className="text-[12px] text-muted">{ward}</span>}
          <span className="text-[11px] text-muted">共 {block.beds.length} 床</span>
          {!isRoom && block.beds.length === 0 && (
            <span className="text-[11px] text-muted">（待添加床号）</span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {block.beds.map((bed, bedIndex) => (
            <span
              key={bed}
              className="flex items-center gap-1 rounded-md bg-surface-alt px-2 py-1 text-[12px] text-main"
            >
              {bed}
              <button aria-label={`前移 ${bed}`} disabled={bedIndex === 0} className="flex h-8 w-6 items-center justify-center disabled:opacity-30" onClick={() => { const beds = [...block.beds]; [beds[bedIndex - 1], beds[bedIndex]] = [beds[bedIndex], beds[bedIndex - 1]]; onUpdate({ beds }); }}><ArrowUp size={12} /></button>
              <button aria-label={`后移 ${bed}`} disabled={bedIndex === block.beds.length - 1} className="flex h-8 w-6 items-center justify-center disabled:opacity-30" onClick={() => { const beds = [...block.beds]; [beds[bedIndex + 1], beds[bedIndex]] = [beds[bedIndex], beds[bedIndex + 1]]; onUpdate({ beds }); }}><ArrowDown size={12} /></button>
              <button
                aria-label={`删除 ${bed}`}
                onClick={() => removeBed(bed)}
                className="text-muted hover:text-danger"
              >
                <X size={13} />
              </button>
            </span>
          ))}
          {block.beds.length === 0 && (
            <span className="text-[12px] text-muted">尚无床号</span>
          )}
        </div>

        <div className="mt-2 flex gap-2">
          <input
            className="input h-9 flex-1 py-1 text-[13px]"
            placeholder={isRoom ? "添加床号，如 44" : "如 J04 或 309WJ04"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addBed();
            }}
          />
          <button className="btn-secondary h-9 px-3" onClick={addBed}>
            <Plus size={15} /> 添加
          </button>
        </div>

        {isRoom && (
          <p className="mt-1.5 text-[11px] text-muted">
            按显示顺序查房，可前移、后移床位；添加完整床号不会改变其他基础床位。
          </p>
        )}
      </div>
      <button
        aria-label="删除块"
        onClick={onRemove}
        className="rounded-lg p-1.5 text-danger hover:bg-danger/10"
      >
        <X size={18} />
      </button>
    </Reorder.Item>
  );
}
