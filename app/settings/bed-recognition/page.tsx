"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSettings, updateSettings, updatePatient } from "@/lib/db";
import { parseBed } from "@/lib/bed-parser";
import { BedType } from "@/types";
import { useApp } from "@/components/Providers";

export default function BedRecognitionPage() {
  const { toast } = useApp();
  const settings = useLiveQuery(() => getSettings(), []);
  const patients = useLiveQuery(() => db.patients.toArray(), []) ?? [];

  const [template, setTemplate] = useState("");
  const [marks, setMarks] = useState("");
  // settings 来自异步 useLiveQuery，首帧为 undefined；useState 只取一次初值，
  // 必须在 settings 就绪后用 effect 同步，否则打开页面输入框为空、点「保存模板」会把已配置清空。
  useEffect(() => {
    if (settings) {
      setTemplate(settings.bedTemplate ?? "");
      setMarks((settings.specialMarks ?? []).join(", "));
    }
  }, [settings]);

  const tpl = settings?.bedTemplate ?? "";
  const mk = settings?.specialMarks ?? [];

  const reparseAll = async () => {
    for (const p of patients) {
      const parsed = parseBed(p.bedNumber, tpl, mk);
      await updatePatient(p.id, {
        ward: parsed.ward,
        bedBase: parsed.bedBase,
        bedType:
          p.bedType === "virtual" ? "virtual" : parsed.bedType,
        specialType: parsed.specialType,
      });
    }
    toast({ message: "已按当前模板重新解析" });
  };

  const saveTemplate = () => {
    try {
      new RegExp(template);
    } catch {
      toast({ message: "正则表达式无效" });
      return;
    }
    updateSettings({
      bedTemplate: template,
      specialMarks: marks
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    });
    toast({ message: "模板已保存" });
  };

  const setType = (id: string, bedType: BedType) => updatePatient(id, { bedType });
  const setRoom = (id: string, room: string) => updatePatient(id, { room });

  return (
    <div className="space-y-4">
      <h1 className="text-[20px] font-semibold text-main">床号识别</h1>

      <div className="card space-y-3 p-3">
        <div>
          <label className="mb-1 block text-[12px] text-muted">
            解析模板（正则，4 个分组：病区基底 / 方位 / 特殊标记 / 床号）
          </label>
          <input
            className="input font-mono text-[13px]"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-[12px] text-muted">
            特殊床标记（逗号分隔，如 J, YZ）
          </label>
          <input
            className="input"
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary h-10 flex-1" onClick={saveTemplate}>
            保存模板
          </button>
          <button className="btn-primary h-10 flex-1" onClick={reparseAll}>
            重新解析全部
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 px-1 text-[13px] font-medium text-muted">
          逐床界定（真实 / 虚拟）
        </p>
        {patients.length === 0 && (
          <p className="rounded-xl bg-card/50 px-4 py-8 text-center text-[13px] text-muted">
            暂无病人
          </p>
        )}
        <div className="space-y-2">
          {patients.map((p) => {
            const parsed = parseBed(p.bedNumber, tpl, mk);
            const isSpecial = parsed.specialType !== "";
            return (
              <div key={p.id} className="card p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-main">
                      {p.bedNumber}
                    </p>
                    <p className="text-[12px] text-muted">
                      病区 {parsed.ward || "—"} · 床号{" "}
                      {parsed.bedBase || "—"}
                      {isSpecial && ` · 标记 ${parsed.specialType}`}
                    </p>
                  </div>
                  {isSpecial && (
                    <select
                      className="rounded-lg border border-border/60 bg-card px-2 py-1.5 text-[12px]"
                      value={p.bedType ?? "extra-real"}
                      onChange={(e) =>
                        setType(p.id, e.target.value as BedType)
                      }
                    >
                      <option value="extra-real">真实加床</option>
                      <option value="virtual">虚拟床</option>
                    </select>
                  )}
                </div>
                {isSpecial && (p.bedType ?? "extra-real") === "extra-real" && (
                  <input
                    className="input mt-2 py-2 text-[13px]"
                    placeholder="归属病房（如 309W41-43）"
                    value={p.room ?? ""}
                    onChange={(e) => setRoom(p.id, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
