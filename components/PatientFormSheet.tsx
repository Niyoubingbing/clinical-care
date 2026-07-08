"use client";

import { useEffect, useState } from "react";
import BottomSheet from "./BottomSheet";
import { useApp } from "./Providers";
import { addPatient, updatePatient, getSettings } from "@/lib/db";
import { parseBed } from "@/lib/bed-parser";
import { Patient } from "@/types";

const PRESET_GROUPS = [
  { name: "解组", color: "#fecaca" },
  { name: "勇组", color: "#bfdbfe" },
  { name: "李组", color: "#bbf7d0" },
  { name: "王组", color: "#fde68a" },
];

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
  const [bedNumber, setBedNumber] = useState("");
  const [name, setName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [group, setGroup] = useState("");
  const [groupColor, setGroupColor] = useState("#e2e8f0");
  const [surgeryDate, setSurgeryDate] = useState("");
  const [dressingFrequency, setDressingFrequency] = useState("");
  const [lastDressingChange, setLastDressingChange] = useState("");
  const [bloodTestDay, setBloodTestDay] = useState("");

  useEffect(() => {
    if (patient) {
      setBedNumber(patient.bedNumber);
      setName(patient.name);
      setDiagnosis(patient.diagnosis);
      setGroup(patient.group ?? "");
      setGroupColor(patient.groupColor ?? "#e2e8f0");
      setSurgeryDate(patient.surgeryDate ?? "");
      setDressingFrequency(
        patient.dressingFrequency ? String(patient.dressingFrequency) : ""
      );
      setLastDressingChange(patient.lastDressingChange ?? "");
      setBloodTestDay(patient.bloodTestDay ?? "");
    } else {
      setBedNumber("");
      setName("");
      setDiagnosis("");
      setGroup("");
      setGroupColor("#e2e8f0");
      setSurgeryDate("");
      setDressingFrequency("");
      setLastDressingChange("");
      setBloodTestDay("");
    }
  }, [patient]);

  const save = async () => {
    if (!bedNumber.trim() || !name.trim() || !diagnosis.trim()) {
      toast({ message: "床号、姓名、诊断为必填项" });
      return;
    }
    const settings = await getSettings();
    const parsed = parseBed(
      bedNumber.trim(),
      settings.bedTemplate,
      settings.specialMarks
    );
    const freq = dressingFrequency ? parseInt(dressingFrequency, 10) : undefined;
    const payload = {
      bedNumber: bedNumber.trim(),
      name: name.trim(),
      diagnosis: diagnosis.trim(),
      group: group || undefined,
      groupColor: groupColor,
      surgeryDate: surgeryDate || undefined,
      dressingFrequency: freq && freq >= 1 ? freq : undefined,
      lastDressingChange: lastDressingChange || undefined,
      bloodTestDay: bloodTestDay || undefined,
      ward: parsed.ward,
      bedBase: parsed.bedBase,
      bedType: parsed.bedType,
      specialType: parsed.specialType,
    };
    if (patient) {
      await updatePatient(patient.id, payload);
      toast({ message: "病人已更新" });
    } else {
      await addPatient(payload);
      toast({ message: "病人已添加" });
    }
    onSaved?.();
    onClose();
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
          placeholder="分组名称（可选）"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESET_GROUPS.map((g) => (
            <button
              key={g.name}
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
          <input
            type="date"
            className="input"
            value={surgeryDate}
            onChange={(e) => setSurgeryDate(e.target.value)}
          />
        </Field>
        <Field label="换药频率（天）">
          <input
            type="number"
            min={1}
            max={90}
            className="input"
            value={dressingFrequency}
            onChange={(e) => setDressingFrequency(e.target.value)}
            placeholder="1-90"
          />
        </Field>
        <Field label="上次换药">
          <input
            type="date"
            className="input"
            value={lastDressingChange}
            onChange={(e) => setLastDressingChange(e.target.value)}
          />
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

      <button
        className="btn-primary h-12 w-full text-[15px]"
        onClick={save}
      >
        保存
      </button>
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
