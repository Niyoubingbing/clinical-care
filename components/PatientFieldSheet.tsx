"use client";

import { useEffect, useState } from "react";
import BottomSheet from "./BottomSheet";
import { db, getSettings, updatePatient } from "@/lib/db";
import { parseBed } from "@/lib/bed-parser";
import { recognizeBed } from "@/lib/bed-identity";
import { useApp } from "./Providers";
import { Patient } from "@/types";

export type PatientField = "bedNumber" | "name" | "diagnosis" | "surgeryDate" | "bloodTestDay";

const META: Record<PatientField, { title: string; label: string; type?: string; required?: boolean }> = {
  bedNumber: { title: "修改床号", label: "床号", required: true },
  name: { title: "修改姓名", label: "姓名", required: true },
  diagnosis: { title: "修改诊断", label: "诊断", required: true },
  surgeryDate: { title: "修改手术日期", label: "手术日期", type: "date" },
  bloodTestDay: { title: "修改查血日", label: "查血日" },
};

export default function PatientFieldSheet({ patient, field, onClose }: {
  patient: Patient;
  field: PatientField | null;
  onClose: () => void;
}) {
  const { toast } = useApp();
  const [value, setValue] = useState("");
  const meta = field ? META[field] : null;

  useEffect(() => {
    if (field) setValue((patient[field] as string | undefined) ?? "");
  }, [field, patient]);

  const save = async () => {
    if (!field) return;
    const next = value.trim();
    if (meta?.required && !next) {
      toast({ message: `${meta.label}不能为空` });
      return;
    }
    if (field === "bedNumber") {
      const duplicate = await db.patients.where("bedNumber").equals(next).first();
      if (duplicate && duplicate.id !== patient.id) {
        toast({ message: `床号 ${next} 已被 ${duplicate.name} 使用` });
        return;
      }
    }
    const patch: Record<string, unknown> = { [field]: next || undefined, updatedAt: Date.now() };
    if (field === "bedNumber") {
      const settings = await getSettings();
      const parsed = parseBed(next, settings.bedTemplate, settings.specialMarks);
      patch.ward = parsed.ward;
      patch.bedBase = parsed.bedBase;
      patch.specialType = parsed.specialType;
      patch.bedType = recognizeBed({ bedNumber: next, ward: parsed.ward, bedBase: parsed.bedBase }, settings);
    }
    await updatePatient(patient.id, patch);
    toast({ message: `${meta?.label}已更新` });
    onClose();
  };

  return (
    <BottomSheet open={!!field} onClose={onClose} title={meta?.title ?? "编辑"}>
      <div className="space-y-3">
        <label className="block text-[13px] font-medium text-main">{meta?.label}</label>
        <input autoFocus type={meta?.type ?? "text"} className="input" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void save()} />
        <button className="btn-primary h-11 w-full" onClick={() => void save()}>完成</button>
      </div>
    </BottomSheet>
  );
}
