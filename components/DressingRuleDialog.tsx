"use client";
import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import type { DressingSchedule } from "@/types";

/** A single editor for global, patient-specific and not-yet-created patient rules.
 * Native modal focus/inert behavior also handles opening above a patient sheet. */
export default function DressingRuleDialog({ value, defaults, allowDefault = false, onSave, onClose }: {
  value?: DressingSchedule; defaults: DressingSchedule; allowDefault?: boolean;
  onSave: (value: DressingSchedule | undefined) => Promise<void>; onClose: () => void;
}) {
  const modal = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [inherit, setInherit] = useState(allowDefault && !value);
  const [draft, setDraft] = useState(() => ({ earlyInterval: String((value || defaults).earlyInterval), laterInterval: String((value || defaults).laterInterval), maxDay: String((value || defaults).maxDay) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  useEffect(() => { const element = modal.current; element?.showModal(); return () => element?.close(); }, []);
  const next = { earlyInterval: Number(draft.earlyInterval), laterInterval: Number(draft.laterInterval), maxDay: Number(draft.maxDay) };
  const valid = Object.values(draft).every(v => v.trim()) && Object.values(next).every(v => Number.isInteger(v) && v >= 1 && v <= 3650) && next.maxDay > next.earlyInterval;
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    if (!inherit && !valid) { setError("请填写 1–3650 的整数，截止日须晚于首次换药日。"); return; }
    lock.current = true; setBusy(true); setError("");
    try { await onSave(inherit ? undefined : next); onClose(); }
    catch { setError("保存失败，请重试；原规则尚未更改。"); }
    finally { lock.current = false; setBusy(false); }
  }
  return <dialog ref={modal} aria-labelledby={titleId} className="dressing-rule-dialog" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onKeyDown={event => { if (event.key === "Escape") event.stopPropagation(); }}>
    <div className="flex items-center justify-between gap-3"><h2 id={titleId} className="text-[17px] font-semibold">换药规则</h2><button type="button" disabled={busy} className="flex h-11 w-11 items-center justify-center text-muted" aria-label="关闭换药规则" onClick={onClose}><X size={20} /></button></div>
    <p className="mb-5 text-[12px] leading-6 text-muted">{allowDefault ? "仅调整此病人的安排；默认规则仍在设置中管理。" : "作为未单独设置病人的默认规则。保存后生效。"}</p>
    <form onSubmit={save} className="space-y-4">
      {allowDefault && <fieldset className="space-y-2"><legend className="sr-only">规则来源</legend><label className="rule-source"><input type="radio" name={titleId} checked={inherit} onChange={() => setInherit(true)} />使用默认规则<span>{defaults.earlyInterval} / {defaults.laterInterval} / {defaults.maxDay} 天</span></label><label className="rule-source"><input type="radio" name={titleId} checked={!inherit} onChange={() => setInherit(false)} />为此病人单独设置</label></fieldset>}
      {!inherit && <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{([{ key: "earlyInterval", label: "首次术后日" }, { key: "laterInterval", label: "间隔天数" }, { key: "maxDay", label: "截止术后日" }] as const).map(field => <label key={field.key} className="block text-[13px] text-main">{field.label}<input className="input mt-2" type="number" min={1} max={3650} step={1} value={draft[field.key]} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} required /></label>)}</div>}
      <p className="rounded-xl bg-surface-alt px-3 py-2 text-[12px] leading-6 text-muted">{inherit ? `术后第 ${defaults.earlyInterval} 天起，每 ${defaults.laterInterval} 天一次，至第 ${defaults.maxDay} 天。` : valid ? `术后第 ${next.earlyInterval} 天起，每 ${next.laterInterval} 天一次，至第 ${next.maxDay} 天。` : "填写完整后，这里会显示规则摘要。"}</p>
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
      <div className="flex gap-3 pt-2"><button type="button" disabled={busy} className="btn-secondary h-11 flex-1" onClick={onClose}>取消</button><button type="submit" disabled={busy} className="btn-primary h-11 flex-1">{busy ? "保存中…" : "保存规则"}</button></div>
    </form>
  </dialog>;
}
