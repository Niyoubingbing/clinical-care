"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

/** 编辑模式下自动保存的字段校验错误（仅作内联展示，不影响其它字段落库）。 */
interface FormErrors {
  bed?: string;
  name?: string;
  diagnosis?: string;
  schedule?: string;
}

/** 载入病人时记录的基线快照，用于 diff 出「用户实际改动」并增量落库。 */
interface Baseline {
  bedNumber: string;
  name: string;
  diagnosis: string;
  group: string;
  groupColor: string;
  surgeryDate: string;
  bloodTestDay: string;
  customScheduleOn: boolean;
  earlyInterval: string;
  laterInterval: string;
  maxDay: string;
}

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
  // 编辑模式下的轻量状态指示：自动保存成功 / 校验错误。
  const [savedHint, setSavedHint] = useState<"saved" | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  // 基线快照：仅在「载入/重置」时写入；自动保存时按 diff 增量落库，并更新基线。
  const baselineRef = useRef<Baseline | null>(null);
  // 是否处于编辑模式（传入了 patient）。编辑模式自动保存、无保存按钮；
  // 新增模式保留「添加病人」按钮。
  const isEdit = !!patient;

  // 载入病人 / 重置表单：写入基线快照并清空提示。
  useEffect(() => {
    if (patient) {
      baselineRef.current = {
        bedNumber: patient.bedNumber,
        name: patient.name,
        diagnosis: patient.diagnosis,
        group: patient.group ?? "",
        groupColor: patient.groupColor ?? DEFAULT_GROUP_COLOR,
        surgeryDate: patient.surgeryDate ?? "",
        bloodTestDay: patient.bloodTestDay ?? "",
        customScheduleOn: !!patient.dressingSchedule,
        earlyInterval: patient.dressingSchedule
          ? String(patient.dressingSchedule.earlyInterval)
          : "",
        laterInterval: patient.dressingSchedule
          ? String(patient.dressingSchedule.laterInterval)
          : "",
        maxDay: patient.dressingSchedule
          ? String(patient.dressingSchedule.maxDay)
          : "",
      };
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
      baselineRef.current = null;
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
    setErrors({});
    setSavedHint(null);
  }, [patient]);

  /**
   * 编辑模式：字段变更即防抖自动落库。
   * - 仅将「相对基线发生变化的合法字段」写入 DB；非法字段跳过并给出内联提示。
   * - 必填项（床号/姓名/诊断）被清空：不覆盖 DB 中已有合法值，内联提示。
   * - 重复床号：跳过本次落库并内联提示。
   * - 换药计划：仅当整数≥1 且截止>前期间隔时写 dressingSchedule，否则内联提示。
   * - 床号变更重算 parseBed 并持久化 ward/bedBase/bedType/specialType（自动床型判定）。
   */
  const autoSave = useCallback(async () => {
    const p = patient;
    const b = baselineRef.current;
    if (!p || !b) return; // 新增模式或不完整的载入状态不自动保存

    const s = await getSettings();
    const patch: Partial<Patient> = {};
    const nextErrors: FormErrors = {};

    // —— 床号 ——
    const normBed = bedNumber.trim();
    if (normBed !== b.bedNumber) {
      if (!normBed) {
        nextErrors.bed = "床号为必填项，已保留原值";
      } else {
        const duplicate = await db.patients
          .where("bedNumber")
          .equals(normBed)
          .first();
        if (duplicate && duplicate.id !== p.id) {
          nextErrors.bed = `床号 ${normBed} 已被 ${duplicate.name} 使用，已保留原值`;
        } else {
          const parsed = parseBed(normBed, s.bedTemplate, s.specialMarks);
          patch.bedNumber = normBed;
          patch.ward = parsed.ward;
          patch.bedBase = parsed.bedBase;
          patch.bedType = parsed.bedType;
          patch.specialType = parsed.specialType;
        }
      }
    }

    // —— 姓名 ——
    const normName = name.trim();
    if (normName !== b.name) {
      if (!normName) nextErrors.name = "姓名为必填项，已保留原值";
      else patch.name = normName;
    }

    // —— 诊断 ——
    const normDiag = diagnosis.trim();
    if (normDiag !== b.diagnosis) {
      if (!normDiag) nextErrors.diagnosis = "诊断为必填项，已保留原值";
      else patch.diagnosis = normDiag;
    }

    // —— 分组 / 颜色 / 手术日期 / 查血日 ——
    if (group !== b.group) patch.group = group || undefined;
    if (groupColor !== b.groupColor) patch.groupColor = groupColor;
    if (surgeryDate !== b.surgeryDate) patch.surgeryDate = surgeryDate || undefined;
    if (bloodTestDay !== b.bloodTestDay)
      patch.bloodTestDay = bloodTestDay || undefined;

    // —— 换药计划（可选）——
    if (customScheduleOn) {
      const e = Number(earlyInterval);
      const l = Number(laterInterval);
      const m = Number(maxDay);
      const valid =
        Number.isInteger(e) &&
        e >= 1 &&
        Number.isInteger(l) &&
        l >= 1 &&
        Number.isInteger(m) &&
        m >= 1 &&
        m > e;
      if (valid) {
        patch.dressingSchedule = {
          earlyInterval: e,
          laterInterval: l,
          maxDay: m,
        } satisfies DressingSchedule;
      } else {
        nextErrors.schedule = "换药间隔需为整数≥1，且截止>前期间隔，本次未保存";
      }
    }

    // 无明显改动且无错误：视为载入/重置后的首次触发，静默跳过（不写库、不提示）。
    if (
      Object.keys(patch).length === 0 &&
      Object.keys(nextErrors).length === 0
    ) {
      return;
    }

    setErrors(nextErrors);

    if (Object.keys(patch).length > 0) {
      await updatePatient(p.id, patch);
      // 同步基线，避免后续 diff 把已落库的字段误判为「又变了」。
      baselineRef.current = { ...b, ...patch } as Baseline;
      setSavedHint("saved");
    }
  }, [
    patient,
    bedNumber,
    name,
    diagnosis,
    group,
    groupColor,
    surgeryDate,
    bloodTestDay,
    customScheduleOn,
    earlyInterval,
    laterInterval,
    maxDay,
  ]);

  // 编辑模式：字段变更后防抖（400ms）自动保存。
  useEffect(() => {
    if (!isEdit || !baselineRef.current) return;
    const t = setTimeout(() => {
      void autoSave();
    }, 400);
    return () => clearTimeout(t);
  }, [autoSave, isEdit]);

  // 「已自动保存」指示自动淡出。
  useEffect(() => {
    if (savedHint !== "saved") return;
    const t = setTimeout(() => setSavedHint(null), 1500);
    return () => clearTimeout(t);
  }, [savedHint]);

  // 新增模式：点击「添加病人」创建病人（创建动作，非保存）。
  const submit = async () => {
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
    if (duplicate) {
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
      const s = await getSettings();
      const parsed = parseBed(normalizedBed, s.bedTemplate, s.specialMarks);
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
      await addPatient(
        payload as Omit<Patient, "id" | "createdAt" | "updatedAt">
      );
      toast({ message: "病人已添加" });
      onSaved?.();
      onClose();
    } catch {
      toast({ message: "添加失败，请重试" });
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
          onBlur={() => void autoSave()}
          placeholder="如 309W23"
        />
        {errors.bed && <ErrorHint text={errors.bed} />}
      </Field>
      <Field label="姓名">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => void autoSave()}
          placeholder="姓名"
        />
        {errors.name && <ErrorHint text={errors.name} />}
      </Field>
      <Field label="诊断">
        <input
          className="input"
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          onBlur={() => void autoSave()}
          placeholder="诊断"
        />
        {errors.diagnosis && <ErrorHint text={errors.diagnosis} />}
      </Field>

      <Field label="分组">
        <input
          className="input"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          onBlur={() => void autoSave()}
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
            onBlur={() => void autoSave()}
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
            onBlur={() => void autoSave()}
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
                onBlur={() => void autoSave()}
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
                onBlur={() => void autoSave()}
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
                onBlur={() => void autoSave()}
                placeholder="14"
              />
            </Field>
          </div>
        )}
        {errors.schedule && <ErrorHint text={errors.schedule} />}
      </div>

      {/* 编辑模式：无保存按钮，字段变更即自动落库；仅展示轻量指示 / 内联错误。
          新增模式：保留「添加病人」创建按钮。 */}
      {isEdit ? (
        <div className="min-h-[20px] text-[12px]">
          {savedHint === "saved" && (
            <span className="text-primary">已自动保存</span>
          )}
        </div>
      ) : (
        <button
          className="btn-primary h-12 w-full text-[15px]"
          onClick={submit}
          disabled={saving}
        >
          {saving ? "添加中…" : "添加病人"}
        </button>
      )}

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

/** 字段级内联错误提示（轻量、不弹 toast）。 */
function ErrorHint({ text }: { text: string }) {
  return <p className="mt-1 text-[12px] text-danger">{text}</p>;
}
