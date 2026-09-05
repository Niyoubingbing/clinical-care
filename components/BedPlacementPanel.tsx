"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Patient, RoundingConfig, Settings } from "@/types";
import { recognizeBed, bedTypeLabel } from "@/lib/bed-identity";
import { normalizeBedNumber } from "@/lib/bed-number";
import { parseBed } from "@/lib/bed-parser";
import { blockLabel, placeBedAfter } from "@/lib/rounding-edit";
import { resolveOrder } from "@/lib/rounding";

export default function BedPlacementPanel({ config, settings, patients, onChange, onError }: {
  config: RoundingConfig; settings: Settings; patients: Patient[];
  onChange: (config: RoundingConfig) => void; onError: (message: string) => void;
}) {
  const [bed, setBed] = useState("");
  const [after, setAfter] = useState("");
  useEffect(() => { setBed(new URLSearchParams(window.location.search).get("bed") || ""); }, []);
  const ordered = useMemo(() => resolveOrder(config, patients.map(p => ({ ...p, ...parseBed(p.bedNumber, settings.bedTemplate, settings.specialMarks), bedNumber: p.bedNumber }))), [config, patients, settings]);
  const unplaced = ordered.filter(row => !row.groupId);
  const apply = () => {
    const full = normalizeBedNumber(bed);
    if (!full) return;
    const parsed = parseBed(full, settings.bedTemplate, settings.specialMarks);
    // Short beds are allowed in a wardless setup, but cannot target one of several wards.
    const wards = new Set(patients.map(p => parseBed(p.bedNumber, settings.bedTemplate, settings.specialMarks).ward).filter(Boolean));
    if (!parsed.ward && wards.size && /^(?:[A-Z]{0,2})\d+(?:-\d+)?$/.test(full)) {
      onError("单床调整请填写带病区的完整床号，例如 309WJ04；通用 J04 可在下方加床块中设置"); return;
    }
    try {
      const type = recognizeBed({ bedNumber: full }, settings);
      onChange(placeBedAfter(config, full, after, type === "extra-real" ? "extra" : "room"));
    } catch (error) { onError(error instanceof Error ? error.message : "调整失败"); }
  };
  return <section className="card space-y-3 p-4" aria-label="单床位置调整">
    <div><h2 className="text-[14px] font-semibold">单床位置调整</h2><p className="mt-1 text-[12px] text-muted">默认路线不变，只调整指定床位；换了病人仍沿用此位置。</p></div>
    <label className="block text-[12px] text-muted">要调整的床位<input list="placement-beds" className="input mt-1" placeholder="完整床号，如 309WJ04" value={bed} onChange={e => setBed(e.target.value)} /></label>
    <datalist id="placement-beds">{patients.map(p => <option key={p.id} value={p.bedNumber}>{p.name}</option>)}</datalist>
    <label className="block text-[12px] text-muted">放置位置<select className="input mt-1 w-full" value={after} onChange={e => setAfter(e.target.value)}>
      <option value="">查房起点</option>{config.blocks.map((block, index) => <option key={block.id} value={block.id}>{index + 1}. {blockLabel(block)} 之后</option>)}
    </select></label>
    <button className="btn-primary h-11 w-full" disabled={!bed.trim()} onClick={apply}>保存此床位置</button>
    {!!unplaced.length && <div className="border-t border-border/30 pt-3"><p className="text-[12px] text-muted">待安排位置 · {unplaced.length} 人（保持可见）</p><div className="mt-2 flex flex-wrap gap-2">{unplaced.map(({ patient }) => <button key={patient.id} onClick={() => setBed(patient.bedNumber)} className="rounded-lg bg-surface-alt px-3 py-2 text-[12px]">{patient.bedNumber} · {patient.name}</button>)}</div></div>}
    <details className="border-t border-border/30 pt-3"><summary className="cursor-pointer text-[12px] text-muted">查看当前查房预览 · {patients.length} 人</summary>
      <p className="my-2 text-[12px] text-muted">按正序展示；基础床号按病区依次套用。首页反序会整体反转。</p>
      <ol className="max-h-72 space-y-1 overflow-auto text-[12px]">{ordered.map(({ patient, groupId }, index) => <li key={patient.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-surface-alt px-3 py-2"><span>{index + 1}. {patient.bedNumber} · {patient.name}</span><span className="text-muted">{bedTypeLabel(recognizeBed(patient, settings))}{!groupId ? " · 待安排" : ""}</span></li>)}</ol>
    </details>
    <Link className="inline-block text-[12px] text-primary" href="/settings/bed-recognition">床位类型不对？前往床号识别 →</Link>
  </section>;
}
