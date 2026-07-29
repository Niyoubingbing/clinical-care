"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import BottomSheet from "./BottomSheet";
import DatePicker from "./DatePicker";
import { useApp } from "./Providers";
import {
  addPatient,
  updatePatient,
  getSettings,
  db,
  DEFAULT_GROUP_COLOR,
} from "@/lib/db";
import { parseBed } from "@/lib/bed-parser";
import { Patient, DressingSchedule } from "@/types";

export function PatientForm({
  patient,
  onSaved,
  onClose,
}: {
  patient?: Patient | null;
  onSaved?: () => void;
  onClose: () => void;
}) {
  const { toast } = useApp();
  const settings = useLiveQuery(() => getSettings(), []);
  const customGroups = settings?.customGroups ?? [];
  const [bedNumber, setBedNumber] = useState("");
  const [name, setName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [group, setGroup] = useState("");
  const [groupColor, setGroupColor] = useState(DEFAULT_GROUP_COLOR);
  const [surgeryDate, setSurgeryDate] = useState("");
  const [bloodTestDay, setBloodTestDay] = useState("");
  const [customScheduleOn, setCustomScheduleOn] = useState(false);
  const [earlyInterval, setEarlyInterval] = useState("");
  const [laterInterval, setLaterInterval] = useState("");
  const [maxDay, setMaxDay] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (patient) {
      setBedNumber(patient.bedNumber);
      setName(patient.name);
      setDiagnosis(patient.diagnosis);
      setGroup(patient.group ?? "");
      setGroupColor(patient.groupColor ?? DEFAULT_GROUP_COLOR);
      setSurgeryDate(patient.surgeryDate ?? "");
      setBloodTestDay(patient.bloodTestDay ?? "");
      if (patient.dressingSchedule) {
        setCustomScheduleOn(true);
        setEarlyInterval(String(patient.dressingSchedule.earlyInterval));
        setLaterInterval(String(patient.dressingSchedule.laterInterval));
        setMaxDay(String(patient.dressingSchedule.maxDay));
      } else {
        setCustomScheduleOn(false);
        setEarlyInterval("");
        setLaterInterval("");
        setMaxDay("");
      }
    } else {
      setBedNumber("");
      setName("");
      setDiagnosis("");
      setGroup("");
      setGroupColor(DEFAULT_GROUP_COLOR);
      setSurgeryDate("");
      setBloodTestDay("");
      setCustomScheduleOn(false);
      setEarlyInterval("");
      setLaterInterval("");
      setMaxDay("");
    }
  }, [patient]);

  const save = async () => {
    if (saving) return;
    if (!bedNumber.trim() || !name.trim() || !diagnosis.trim()) {
      toast({ message: "床号、姓名、诊断为必填项" });
      return;
    }
    const normalizedBed = bedNumber.trim();
    const duplicate = await db.patients
      .where("bedNumber")
      .equals(normalizedBed)
      .first();
    if (duplicate && duplicate.id !== patient?.id) {
      toast({ message: `床号 ${normalizedBed} 已被 ${duplicate.name} 使用` });
      return;
    }

    const early = Number(earlyInterval);
    const later = Number(laterInterval);
    const max = Number(maxDay);
    const customValid =
      customScheduleOn &&
      Number.isInteger(early) &&
      early >= 1 &&
      Number.isInteger(later) &&
      later >= 1 &&
      Number.isInteger(max) &&
      max >= 1 &&
      max > early;

    setSaving(true);
    try {
      const settings = await getSettings();
      const parsed = parseBed(
        normalizedBed,
        settings.bedTemplate,
        settings.specialMarks
      );
      const payload: Partial<Patient> = {
        bedNumber: normalizedBed,
        name: name.trim(),
        diagnosis: diagnosis.trim(),
        group: group || undefined,
        groupColor: groupColor,
        surgeryDate: surgeryDate || undefined,
        bloodTestDay: bloodTestDay || undefined,
        ward: parsed.ward,
        bedBase: parsed.bedBase,
        bedType: parsed.bedType,
        specialType: parsed.specialType,
      };
      // 仅在开启自定义间隔且参数合法时写入每病人换药计划；否则不写（继承全局默认）。
      if (customValid) {
        payload.dressingSchedule = {
          earlyInterval: early,
          laterInterval: later,
          maxDay: max,
        } satisfies DressingSchedule;
      }
      if (patient) {
        await updatePatient(patient.id, payload);
        toast({ message: "病人已更新" });
      } else {
        await addPatient(
          payload as Omit<Patient, "id" | "createdAt" | "updatedAt">
        );
        toast({ message: "病人已添加" });
      }
      onSaved?.();
      onClose();
    } catch {
      toast({ message: patient ? "更新失败，请重试" : "添加失败，请重试" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Field label="床号">
        <input
          className="input"
          value={bedNumber}
          onChange={(e) => setBedNumber(e.target.value)}
          placeholder="如 309W23"
        />
      </Field>
      <Field label="姓名">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="姓名"
        />
      </Field>
      <Field label="诊断">
        <input
          className="input"
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          placeholder="诊断"
        />
      </Field>

      <Field label="分组">
        <input
          className="input"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          placeholder="分组名称（可选，可在设置页自定义）"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {customGroups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                setGroup(g.name);
                setGroupColor(g.color);
              }}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] ${
                group === g.name
                  ? "border-primary text-primary"
                  : "border-border/60 text-muted"
              }`}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: g.color }}
              />
              {g.name}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[12px] text-muted">分组颜色</span>
          <input
            type="color"
            value={groupColor}
            onChange={(e) => setGroupColor(e.target.value)}
            className="h-8 w-12 cursor-pointer rounded border border-border/60 bg-card"
          />
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="手术日期">
          <button
            type="button"
            onClick={() => setDatePickerOpen(true)}
            className="input flex w-full items-center justify-between text-left"
          >
            <span className={surgeryDate ? "text-main" : "text-muted"}>
              {surgeryDate || "未设置"}
            </span>
            <span className="text-[12px] text-muted">选择</span>
          </button>
        </Field>
        <Field label="查血日">
          <input
            className="input"
            value={bloodTestDay}
            onChange={(e) => setBloodTestDay(e.target.value)}
            placeholder="如 周一 周三"
          />
        </Field>
      </div>

      {/* 换药计划（可选）：开启后覆盖全局默认换药间隔 */}
      <div className="rounded-2xl border border-border/40 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-main">换药计划</span>
          <button
            type="button"
            role="switch"
            aria-checked={customScheduleOn}
            onClick={() => setCustomScheduleOn((v) => !v)}
            className={`relative h-6 w-11 rounded-full transition ${
              customScheduleOn ? "bg-primary" : "bg-surface-alt"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                customScheduleOn ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
        <p className="mt-1 text-[12px] text-muted">
          {customScheduleOn
            ? "自定义间隔，覆盖全局默认换药规则"
            : "继承默认规则（术后第 2 天起，每 3 天一次，至第 14 天）"}
        </p>
        {customScheduleOn && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Field label="前期间隔(天)">
              <input
                type="number"
                min={1}
                className="input"
                value={earlyInterval}
                onChange={(e) => setEarlyInterval(e.target.value)}
                placeholder="2"
              />
            </Field>
            <Field label="后期间隔(天)">
              <input
                type="number"
                min={1}
                className="input"
                value={laterInterval}
                onChange={(e) => setLaterInterval(e.target.value)}
                placeholder="3"
              />
            </Field>
            <Field label="截止(术后天数)">
              <input
                type="number"
                min={1}
                className="input"
                value={maxDay}
                onChange={(e) => setMaxDay(e.target.value)}
                placeholder="14"
              />
            </Field>
          </div>
        )}
      </div>

      <button
        className="btn-primary h-12 w-full text-[15px]"
        onClick={save}
        disabled={saving}
      >
        {saving ? "保存中…" : "保存"}
      </button>

      <DatePicker
        open={datePickerOpen}
        value={surgeryDate}
        onClose={() => setDatePickerOpen(false)}
        onSelect={(d) => setSurgeryDate(d)}
        onClear={() => setSurgeryDate("")}
      />
    </div>
  );
}

export default function PatientFormSheet({
  open,
  onClose,
  patient,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  patient?: Patient | null;
  onSaved?: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={patient ? "编辑病人" : "添加病人"}>
      <PatientForm patient={patient} onSaved={onSaved} onClose={onClose} />
    </BottomSheet>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-main">
        {label}
      </label>
      {children}
    </div>
  );
}
