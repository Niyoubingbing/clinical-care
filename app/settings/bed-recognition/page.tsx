"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSettings } from "@/lib/db";
import { parseBed, DEFAULT_BED_TEMPLATE, DEFAULT_SPECIAL_MARKS } from "@/lib/bed-parser";
import { recognizeBed, bedTypeLabel } from "@/lib/bed-identity";
import { bedKey } from "@/lib/bed-number";
import { setBedTypeOverride } from "@/lib/bed-settings";
import { findRouteBlock } from "@/lib/rounding-match";
import { blockLabel } from "@/lib/rounding-edit";
import type { BedType } from "@/types";
import { useApp } from "@/components/Providers";
import SubpageHeader from "@/components/SubpageHeader";

export default function BedRecognitionPage() {
  const { toast } = useApp();
  const settings = useLiveQuery(() => getSettings(), []);
  const patients = useLiveQuery(() => db.patients.toArray(), []);
  const [template, setTemplate] = useState("");
  const [marks, setMarks] = useState("");
  const [sample, setSample] = useState("309WJ04");
  const [manualBed, setManualBed] = useState("");
  const [manualType, setManualType] = useState<Exclude<BedType, "unrecognized">>("extra-real");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);

  const savedTemplate = settings?.bedTemplate ?? DEFAULT_BED_TEMPLATE;
  const savedMarks = (settings?.specialMarks ?? DEFAULT_SPECIAL_MARKS).join(", ");
  useEffect(() => {
    setTemplate(savedTemplate);
    setMarks(savedMarks);
  }, [savedTemplate, savedMarks]);

  const rows = useMemo(() => {
    if (!settings) return [];
    return (patients || []).map(p => {
      const parsed = parseBed(p.bedNumber, settings.bedTemplate, settings.specialMarks);
      return { p, parsed, type: recognizeBed(p, settings), owner: findRouteBlock({ ...p, ...parsed }, settings.roundingOrder.blocks) };
    }).sort((a, b) => Number(b.type === "unrecognized") - Number(a.type === "unrecognized") || a.p.bedNumber.localeCompare(b.p.bedNumber, "zh", { numeric: true }));
  }, [patients, settings]);

  const run = async (work: () => Promise<void>, message: string) => {
    if (saving.current) return;
    saving.current = true; setBusy(true);
    try { await work(); toast({ message }); }
    catch (error) { toast({ message: error instanceof Error ? error.message : "保存失败，请重试" }); }
    finally { saving.current = false; setBusy(false); }
  };
  const saveParser = async () => {
    const nextTemplate = template.trim();
    if (!nextTemplate) { toast({ message: "模板不能为空，可使用默认规则" }); return; }
    try { new RegExp(nextTemplate); } catch { toast({ message: "正则表达式无效" }); return; }
    const specialMarks = [...new Set(marks.split(/[,，\s]+/).map(m => m.trim().toUpperCase()).filter(Boolean))];
    if (specialMarks.some(mark => !/^[A-Z]{1,2}$/.test(mark))) { toast({ message: "特殊标记请使用 1–2 个字母，例如 J、YZ" }); return; }
    await run(async () => {
      await db.transaction("rw", db.settings, db.patients, async () => {
        const current = await getSettings();
        await db.settings.put({ ...current, bedTemplate: nextTemplate, specialMarks, id: 1 });
        for (const patient of await db.patients.toArray()) {
          const parsed = parseBed(patient.bedNumber, nextTemplate, specialMarks);
          await db.patients.update(patient.id, { ward: parsed.ward, bedBase: parsed.bedBase, specialType: parsed.specialType });
        }
      });
    }, "识别规则已保存，现有床号已重新解析；查房顺序未改变");
  };

  if (!settings) return <div className="py-10 text-center text-muted">加载中…</div>;
  const markList = marks.split(/[,，\s]+/).filter(Boolean);
  const preview = parseBed(sample, template, markList);
  const corrections = [
    ...(settings.bedTypeOverrides || []),
    ...(settings.virtualOverrides || []).filter(b => !settings.bedTypeOverrides?.some(item => bedKey(item.bedNumber) === bedKey(b))).map(bedNumber => ({ bedNumber, type: "virtual" as const })),
  ];
  return (
    <div className="space-y-5">
      <SubpageHeader title="床号识别" description="识别床位类型，查房位置单独管理。" />
      <div className="rounded-xl bg-surface-alt px-4 py-3 text-[13px] leading-relaxed text-muted">
        默认支持普通床、J / YZ 加床与子床。未识别的床号会标记为「待确认」，不会自动隐藏。单床修正优先于识别规则，换了病人仍然有效。
      </div>
      <div className="subpage-section-heading">
        <div><h2>当前床位</h2><p>{rows.filter(row => row.type === "unrecognized").length} 个待确认 · {rows.filter(row => !row.owner).length} 个待安排位置</p></div>
        <Link href="/settings/rounding" className="text-[13px] text-primary">调整查房顺序 →</Link>
      </div>
      {!rows.length && <p className="card p-6 text-center text-[13px] text-muted">导入病人后，在这里查看识别结果。</p>}
      <div className="space-y-2">
        {rows.map(({ p, parsed, type, owner }) => {
          const correction = corrections.find(item => bedKey(item.bedNumber) === bedKey(p.bedNumber));
          return <div key={p.id} className="card space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="break-words text-[14px] font-medium">{p.bedNumber} · {p.name}</p><p className="mt-1 text-[12px] text-muted">{parsed.ward || "未指定病区"}{parsed.specialType ? ` · 标记 ${parsed.specialType}` : ""}</p></div>
              <span className={type === "virtual" ? "badge-virtual" : type === "extra-real" ? "badge-special" : "badge-muted"}>{bedTypeLabel(type)}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <select aria-label={`${p.bedNumber} 床位类型`} className="input h-10 w-auto max-w-full py-1 text-[12px]" value={correction?.type || "auto"} disabled={busy} onChange={e => { const value = e.target.value; void run(() => setBedTypeOverride(p.bedNumber, value === "auto" ? null : value as Exclude<BedType, "unrecognized">), "床位类型已保存"); }}>
                <option value="auto">自动识别</option><option value="real">指定为普通床</option><option value="extra-real">指定为加床</option><option value="virtual">指定为虚拟床</option>
              </select>
              <Link className="text-[12px] text-primary" href={`/settings/rounding?bed=${encodeURIComponent(p.bedNumber)}`}>调整位置 →</Link>
            </div>
            <p className="text-[12px] text-muted">{owner ? `所属：${blockLabel(owner)}` : "待安排位置 · 当前显示在已安排床位之后"}</p>
          </div>;
        })}
      </div>

      <details className="card p-4">
        <summary className="cursor-pointer text-[14px] font-medium">单床修正 · {corrections.length} 个</summary>
        <p className="mt-3 text-[12px] text-muted">也可以提前配置空床。恢复自动识别不会改动查房顺序。</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input aria-label="修正床号" className="input min-w-0 flex-1" placeholder="完整床号，如 309WJ04" value={manualBed} onChange={e => setManualBed(e.target.value)} />
          <select aria-label="修正类型" className="input w-auto" value={manualType} onChange={e => setManualType(e.target.value as Exclude<BedType, "unrecognized">)}><option value="extra-real">加床</option><option value="real">普通床</option><option value="virtual">虚拟床</option></select>
          <button className="btn-primary h-11" disabled={busy || !manualBed.trim()} onClick={() => void run(() => setBedTypeOverride(manualBed, manualType), "单床修正已保存")}>保存修正</button>
        </div>
        {corrections.map(item => <div key={item.bedNumber} className="mt-2 flex items-center justify-between gap-2 text-[13px]"><span>{item.bedNumber} · {bedTypeLabel(item.type)}</span><button className="h-10 text-primary" disabled={busy} onClick={() => void run(() => setBedTypeOverride(item.bedNumber, null), "已恢复自动识别")}>恢复自动</button></div>)}
      </details>

      <details className="card p-4">
        <summary className="cursor-pointer text-[14px] font-medium">识别规则 · 高级设置</summary>
        <div className="mt-4 space-y-3">
          <p className="text-[12px] text-muted">默认规则兼容大小写、全角字符、J4 / J04 和 01-2 子床。自定义模板支持四个捕获组（病区数字、方位、特殊标记、床号），也支持命名组 ward、mark、bed。</p>
          <label className="block text-[13px]">床号模板<input className="input mt-1 font-mono text-[12px]" value={template} onChange={e => setTemplate(e.target.value)} /></label>
          <label className="block text-[13px]">加床标记<input className="input mt-1" value={marks} onChange={e => setMarks(e.target.value)} /></label>
          <label className="block text-[13px]">试一试床号<input className="input mt-1" value={sample} onChange={e => setSample(e.target.value)} /></label>
          <p className="rounded-lg bg-surface-alt p-3 text-[12px]" role="status">{preview.matched ? `${bedTypeLabel(preview.bedType)} · 病区 ${preview.ward || "未指定"} · 床号 ${preview.bedBase}${preview.specialType ? ` · ${preview.specialType}` : ""}` : "未匹配 · 会保持可见，等待手动确认"}</p>
          <div className="flex gap-2"><button className="btn-secondary flex-1" onClick={() => { setTemplate(DEFAULT_BED_TEMPLATE); setMarks(DEFAULT_SPECIAL_MARKS.join(", ")); }}>填入默认规则</button><button className="btn-primary flex-1" disabled={busy} onClick={() => void saveParser()}>保存识别规则</button></div>
        </div>
      </details>
    </div>
  );
}
