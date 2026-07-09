"use client";

import { useEffect, useState } from "react";
import BottomSheet from "./BottomSheet";
import { useApp } from "./Providers";
import { addTodo } from "@/lib/db";
import { parseTime, inferTodoType } from "@/lib/time-parser";

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
  const [parse, setParse] = useState<ReturnType<typeof parseTime>>(null);

  useEffect(() => {
    if (open) {
      setContent("");
      setParse(null);
    }
  }, [open]);

  const onContentChange = (v: string) => {
    setContent(v);
    setParse(parseTime(v));
  };

  const submit = async () => {
    const text = content.trim();
    if (!text) {
      toast({ message: "请输入待办内容" });
      return;
    }
    // 病人与通用待办统一：只存内容 + 推断类型 + 解析出的日期，
    // 不再区分两套字段（类型/目标日期由内容自动推断）。
    const p = parseTime(text);
    await addTodo({
      patientId: patientId ?? null,
      content: text,
      type: inferTodoType(text),
      dueDate: p?.date,
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
            placeholder={
              patientId
                ? "如：星期二出院 / 后天换药 / 周四复查X光"
                : "如：交班记录 / 写病历 / 周会"
            }
          />
          <p className="mt-1 text-[12px] text-muted">
            {parse
              ? `识别到时间：${parse.date}（${parse.label}）`
              : "未识别到时间"}
          </p>
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
