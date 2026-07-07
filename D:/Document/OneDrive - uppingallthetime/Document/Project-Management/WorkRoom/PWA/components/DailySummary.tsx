"use client";

import { useState } from "react";
import { ChevronDown, Copy, Download } from "lucide-react";
import { DailySummary } from "@/lib/summary";

export default function DailySummaryCard({
  summary,
  onCopy,
  onExport,
}: {
  summary: DailySummary;
  onCopy: () => void;
  onExport: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <span className="text-[14px] font-semibold text-main">每日小结</span>
        <span className="text-[12px] text-muted">
          {summary.hasItems
            ? `换药 ${summary.dressing} · 查血 ${summary.bloodTest}`
            : "今日暂无完成项"}
        </span>
        <ChevronDown
          size={18}
          className={`ml-auto text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-border/50 px-4 py-3">
          {summary.hasItems ? (
            <>
              <pre className="whitespace-pre-wrap break-words text-[13px] text-main">
                {summary.text}
              </pre>
              <div className="mt-3 flex gap-3">
                <button className="btn-secondary h-10 flex-1" onClick={onCopy}>
                  <Copy size={16} /> 复制
                </button>
                <button
                  className="btn-secondary h-10 flex-1"
                  onClick={onExport}
                >
                  <Download size={16} /> 导出 JSON
                </button>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-muted">今日还没有完成任何待办</p>
          )}
        </div>
      )}
    </div>
  );
}
