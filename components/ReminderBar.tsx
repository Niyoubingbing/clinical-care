"use client";

import { AlertTriangle, Bell } from "lucide-react";
import { ReminderSummary } from "@/lib/reminders";

export default function ReminderBar({
  summary,
  onClick,
}: {
  summary: ReminderSummary;
  onClick: () => void;
}) {
  if (!summary.hasAny) return null;
  const danger = summary.level === "danger";
  const parts: string[] = [];
  if (summary.overdueTodos > 0) parts.push(`${summary.overdueTodos} 个待办已逾期`);
  if (summary.needDressing > 0) parts.push(`${summary.needDressing} 人需换药`);
  if (summary.todayTodos > 0) parts.push(`今天 ${summary.todayTodos} 个待办到期`);
  if (summary.needBlood > 0) parts.push(`${summary.needBlood} 人需查血`);

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[13px] font-medium text-white shadow-sm transition active:scale-[0.99] ${
        danger ? "bg-danger" : "bg-warning"
      }`}
    >
      {danger ? (
        <AlertTriangle size={18} />
      ) : (
        <Bell size={18} />
      )}
      <span className="flex-1">{parts.join("，")}</span>
    </button>
  );
}
