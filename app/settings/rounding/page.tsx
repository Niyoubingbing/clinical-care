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
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { getSettings, updateSettings, defaultRoundingConfig, db } from "@/lib/db";
import {
  basicRuleFromCounts,
  exportConfigText,
  importConfigText,
  blockLabel,
  normalizeBeds,
  isFullBed,
} from "@/lib/rounding-edit";
import { RoundingConfig, RoundingBlock } from "@/types";
import { useApp } from "@/components/Providers";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export default function RoundingPage() {
  const { toast } = useApp();
  const settings = useLiveQuery(() => getSettings(), []);
  const [config, setConfig] = useState<RoundingConfig | null>(null);
  const [basicCount, setBasicCount] = useState(40);
  const [basicAvg, setBasicAvg] = useState(3);
  const [showIO, setShowIO] = useState(false);
  const [ioText, setIoText] = useState("");
  const inited = useRef(false);

  // 仅初始化一次：从 DB 读取（已迁移），缺失则回填。
  useEffect(() => {
    if (!settings || inited.current) return;
    inited.current = true;
    const c = settings.roundingOrder;
    setConfig(c);
    if (c.regularBedCount) setBasicCount(c.regularBedCount);
    if (c.avgBedsPerRoom) setBasicAvg(c.avgBedsPerRoom);
  }, [settings]);

  if (!config) return <div className="py-10 text-center text-muted">加载中…</div>;

  const save = (next: RoundingConfig) => {
    setConfig(next);
    updateSettings({ roundingOrder: next });
  };

  // 任意病房块/床号/加床的编辑都视为自定义。
  const updateBlock = (id: string, patch: Partial<RoundingBlock>) => {
    save({
      ...config,
      ruleType: "custom",
      blocks: config.blocks.map((b) =>
        b.id === id ? ({ ...b, ...patch } as RoundingBlock) : b
      ),
    });
  };
  const removeBlock = (id: string) =>
    save({ ...config, blocks: config.blocks.filter((b) => b.id !== id) });

  const onReorder = (ids: string[]) => {
    const byId = new Map(config.blocks.map((b) => [b.id, b]));
    const next = ids
      .map((id) => byId.get(id))
      .filter((b): b is RoundingBlock => Boolean(b));
    save({ ...config, blocks: next });
  };

  // 规则态切换
  const switchRule = (rule: RoundingConfig["ruleType"]) => {
    if (rule === "default") {
      save(defaultRoundingConfig());
      return;
    }
    if (rule === "basic") {
      const hasFull = config.blocks.some((b) => b.beds.some(isFullBed));
      // 从默认（带前缀）切换或当前无块时，清空以便走向导；否则保留已编辑块。
      const fresh = config.ruleType === "default" || hasFull || config.blocks.length === 0;
      save({
        ruleType: "basic",
        regularBedCount: basicCount,
        avgBedsPerRoom: basicAvg,
        blocks: fresh ? [] : config.blocks,
      });
      return;
    }
    save({ ...config, ruleType: "custom" });
  };

  const generateBasic = () => {
    const count = Math.min(2000, Math.max(1, Math.floor(basicCount) || 1));
    const avg = Math.min(200, Math.max(1, Math.floor(basicAvg) || 1));
    save({
      ruleType: "basic",
      regularBedCount: count,
      avgBedsPerRoom: avg,
      blocks: basicRuleFromCounts(count, avg),
    });
    toast({ message: `已按 ${count} 床 / 每房 ${avg} 床 生成病房块` });
  };

  const addRoom = () =>
    save({
      ...config,
      ruleType: "custom",
      blocks: [...config.blocks, { id: crypto.randomUUID(), kind: "room", beds: ["01"] }],
    });
  const addExtra = () =>
    save({
      ...config,
      ruleType: "custom",
      blocks: [...config.blocks, { id: crypto.randomUUID(), kind: "extra", beds: [] }],
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
    toast({ message: "已导入查房顺序" });
  };

  const ruleType = config.ruleType;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold text-main">查房顺序</h1>
        <button
          onClick={() => {
            save(defaultRoundingConfig());
            toast({ message: "已恢复默认规则" });
          }}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] text-muted hover:bg-surface-alt"
        >
          <RotateCcw size={16} /> 恢复默认
        </button>
      </div>

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
          <p className="text-[11px] text-muted/70">
            病房数 = ceil(普通病床数 ÷ 平均病房床数)，块内基础床号连续、可增删。
          </p>
          <button className="btn-primary h-10 w-full" onClick={generateBasic}>
            生成病房块
          </button>
        </div>
      )}

      {/* 块列表 */}
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
          {config.blocks.map((b) => (
            <BlockCard
              key={b.id}
              block={b}
              onUpdate={(patch) => updateBlock(b.id, patch)}
              onRemove={() => removeBlock(b.id)}
            />
          ))}
        </Reorder.Group>
      )}

      <div className="flex gap-2 pt-1">
        <button className="btn-secondary h-11 flex-1 whitespace-nowrap" onClick={addRoom}>
          <Plus size={16} /> 添加病房块
        </button>
        <button className="btn-secondary h-11 flex-1 whitespace-nowrap" onClick={addExtra}>
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
    <span
      onPointerDown={(e) => controls.start(e)}
      aria-label="拖拽排序"
      className="mt-1 shrink-0 cursor-grab touch-none select-none text-muted active:cursor-grabbing"
    >
      <GripVertical size={18} />
    </span>
  );
}

function BlockCard({
  block,
  onUpdate,
  onRemove,
}: {
  block: RoundingBlock;
  onUpdate: (patch: Partial<RoundingBlock>) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const [draft, setDraft] = useState("");

  const isRoom = block.kind === "room";
  const ward = block.kind === "room" ? block.ward : undefined;

  const addBed = () => {
    const raw = draft.trim();
    if (!raw) return;
    let bed: string;
    if (isRoom) {
      const n = parseInt(raw, 10);
      if (isNaN(n)) return;
      bed = ward ? `${ward}${pad2(n)}` : pad2(n);
    } else {
      bed = raw;
    }
    onUpdate({ beds: normalizeBeds([...block.beds, bed]) });
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
    >
      <DragHandle controls={controls} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
              isRoom ? "bg-primary/10 text-primary" : "bg-warning/15 text-warning"
            }`}
          >
            {isRoom ? "病房块" : "真实加床块"}
          </span>
          {isRoom && ward && <span className="text-[12px] text-muted">{ward}</span>}
          <span className="text-[11px] text-muted">共 {block.beds.length} 床</span>
          {!isRoom && block.beds.length === 0 && (
            <span className="text-[11px] text-muted/70">（待添加床号）</span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {block.beds.map((bed) => (
            <span
              key={bed}
              className="flex items-center gap-1 rounded-md bg-surface-alt px-2 py-1 text-[12px] text-main"
            >
              {bed}
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
            <span className="text-[12px] text-muted/60">尚无床号</span>
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
          <p className="mt-1.5 text-[11px] text-muted/70">
            基础床号，升序；病房块内可单独增删（如某房仅 2 床，去掉 03）。
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
