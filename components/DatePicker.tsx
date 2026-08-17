"use client";

import React, { useEffect, useState } from "react";
import BottomSheet from "./BottomSheet";
import { todayStr } from "@/lib/db";

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

function ymd(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export default function DatePicker({
  value,
  onSelect,
  onClear,
  open,
  onClose,
}: {
  value?: string;
  onSelect: (date: string) => void;
  onClear: () => void;
  open: boolean;
  onClose: () => void;
}) {
  const today = todayStr();
  const init = value ? new Date(value + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(init.getFullYear());
  const [viewMonth, setViewMonth] = useState(init.getMonth());

  // 每次打开时，视图回到「当前选中日期」或「今天」，方便快速定位。
  useEffect(() => {
    if (!open) return;
    const d = value ? new Date(value + "T00:00:00") : new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [open, value]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={`${viewYear} 年 ${viewMonth + 1} 月`}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="上个月"
            onClick={prevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt text-main transition active:scale-95"
          >
            ‹
          </button>
          <span className="text-[15px] font-semibold text-main">
            {viewYear} 年 {viewMonth + 1} 月
          </span>
          <button
            type="button"
            aria-label="下个月"
            onClick={nextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt text-main transition active:scale-95"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[12px] text-muted">
          {WEEK.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={`e${i}`} />;
            const dateStr = ymd(viewYear, viewMonth, d);
            const selected = value === dateStr;
            const isToday = dateStr === today;
            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => {
                  onSelect(dateStr);
                  onClose();
                }}
                className={`h-10 rounded-xl text-[13px] font-medium transition active:scale-95 ${
                  selected
                    ? "bg-primary text-white"
                    : isToday
                      ? "bg-primary/10 text-primary"
                      : "text-main hover:bg-surface-alt"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onSelect(today);
              onClose();
            }}
            className="btn-secondary h-11 flex-1 text-[14px]"
          >
            今天
          </button>
          <button
            type="button"
            onClick={() => {
              onClear();
              onClose();
            }}
            className="btn-secondary h-11 flex-1 text-[14px]"
          >
            清除
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
