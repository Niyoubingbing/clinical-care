"use client";

import { Droplet, TestTube, Plus } from "lucide-react";
import { useApp } from "./Providers";
import { addTodo, todayStr } from "@/lib/db";

export default function QuickActions({
  patientId,
  onAddTodo,
}: {
  patientId: string;
  onAddTodo: () => void;
}) {
  const { toast } = useApp();

  const addDressing = async () => {
    await addTodo({
      patientId,
      content: "换药",
      type: "换药",
      dueDate: todayStr(),
    });
    toast({ message: "换药日期已更新" });
  };

  const addBlood = async () => {
    await addTodo({
      patientId,
      content: "查血",
      type: "查血",
      dueDate: todayStr(),
    });
    toast({ message: "已添加查血待办" });
  };

  const items = [
    { label: "换药", icon: Droplet, onClick: addDressing, color: "text-success" },
    { label: "查血", icon: TestTube, onClick: addBlood, color: "text-warning" },
    { label: "添加待办", icon: Plus, onClick: onAddTodo, color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <button
            key={it.label}
            onClick={it.onClick}
            className="card-interactive flex flex-col items-center gap-1.5 py-3 active:scale-[0.97]"
          >
            <Icon size={20} className={it.color} />
            <span className="text-[12px] font-medium text-main">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
