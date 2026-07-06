"use client";

import { useEffect, useState } from "react";
import BottomSheet from "./BottomSheet";
import { useApp } from "./Providers";
import { addTodo, todayStr } from "@/lib/db";
import { parseTime } from "@/lib/time-parser";

const TODO_TYPES = [
  "换药",
  "查血",
  "开术前",
  "明天出院",
  "康复会诊",
  "会诊",
  "复查",
  "开查血",
  "其他",
];

export default function TodoFormSheet({
  open,
  onClose,
  patientId,
  patientName,
}: {
  open: boolean;
  onClose: () => void;
  patientId?: string | null;
  patientName?: string;
}) {
  const { toast } = useApp();
  const [content, setContent] = useState("");
  const [type, setType] = useState("其他");
  const [dueDate, setDueDate] = useState(todayStr());
  const [dateTouched, setDateTouched] = useState(false);
  const [parse, setParse] = useState<ReturnType<typeof parseTime>>(null);

  useEffect(() => {
    if (open) {
      setContent("");
      setType("其他");
      setDueDate(todayStr());
      setDateTouched(false);
      setParse(null);
    }
  }, [open]);

  const onContentChange = (v: string) => {
    setContent(v);
    const p = parseTime(v);
    setParse(p);
    if (p && !dateTouched) setDueDate(p.date);
  };

  const submit = async () => {
    const text = content.trim();
    if (!text) {
      toast({ message: "请输入待办内容" });
      return;
    }
    await addTodo({
      patientId: patientId ?? null,
      content: text,
      type,
      dueDate: dueDate || undefined,
    });
    toast({
      message: patientId ? "待办已添加" : "通用待办已添加",
    });
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={patientId ? `添加待办 · ${patientName ?? ""}` : "添加通用待办"}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-main">
            内容
          </label>
          <textarea
            className="input min-h-[88px] resize-none"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="如：星期二出院 / 后天换药 / 周四复查X光"
          />
          <p className="mt-1 text-[12px] text-muted">
            {parse
              ? `识别到时间：${parse.date}（${parse.label}）`
              : "未识别到时间"}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-main">
            类型
          </label>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {TODO_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-main">
            目标日期
          </label>
          <input
            type="date"
            className="input"
            value={dueDate}
            onChange={(e) => {
              setDateTouched(true);
              setDueDate(e.target.value);
            }}
          />
        </div>

        <button
          className="btn-primary h-12 w-full text-[15px]"
          onClick={submit}
        >
          确定
        </button>
      </div>
    </BottomSheet>
  );
}
