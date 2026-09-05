"use client";

import { useRef, useState } from "react";
import { ArrowDownNarrowWide, ArrowUpNarrowWide, Eye, EyeOff } from "lucide-react";
import { updateSettings } from "@/lib/db";
import { useApp } from "./Providers";

export default function RoundingFilterBar({ groups, selected, onGroupChange, direction, showVirtual, ready }: {
  groups: string[]; selected: string | null; onGroupChange: (group: string | null) => void;
  direction: "forward" | "reverse"; showVirtual: boolean; ready: boolean;
}) {
  const { toast } = useApp();
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  async function save(patch: { listDirection?: "forward" | "reverse"; showVirtualBeds?: boolean }) {
    if (lock.current) return;
    lock.current = true; setSaving(true);
    try { await updateSettings(patch); }
    catch { toast({ message: "显示偏好保存失败，请重试" }); }
    finally { lock.current = false; setSaving(false); }
  }
  const reverse = direction === "reverse";
  const OrderIcon = reverse ? ArrowUpNarrowWide : ArrowDownNarrowWide;
  const VisibilityIcon = showVirtual ? Eye : EyeOff;
  return <section className="rounding-filters" aria-label="查房筛选与显示">
    <div className="rounding-filter-groups scrollbar-hide" role="group" aria-label="病人分组">
      {[null, ...groups].map(group => <button key={group ?? "__all__"} type="button" aria-pressed={selected === group} className={`rounding-group-tab ${selected === group ? "is-selected" : ""}`} onClick={() => onGroupChange(group)}>{group ?? "全部"}</button>)}
    </div>
    <div className="rounding-filter-options">
      <button type="button" className="rounding-option" disabled={!ready || saving} aria-label={`查房排序：${reverse ? "反序" : "正序"}，点击切换为${reverse ? "正序" : "反序"}`} title={`切换为${reverse ? "正序" : "反序"}`} onClick={() => void save({ listDirection: reverse ? "forward" : "reverse" })}><OrderIcon size={15} /><span>{reverse ? "反序" : "正序"}</span></button>
      <span className="rounding-filter-divider" aria-hidden="true" />
      <button type="button" className="rounding-option" disabled={!ready || saving} aria-pressed={showVirtual} aria-label="显示虚拟床" title={showVirtual ? "点击隐藏虚拟床" : "点击显示虚拟床"} onClick={() => void save({ showVirtualBeds: !showVirtual })}><VisibilityIcon size={15} /><span>虚拟床<span className="rounding-option-state">{showVirtual ? "已显示" : "已隐藏"}</span></span></button>
    </div>
  </section>;
}
