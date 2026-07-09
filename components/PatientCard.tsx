"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import { Patient, BedType } from "@/types";
import { PatientStatus } from "@/lib/reminders";
import { contrastTextColor, bedBlockLabel } from "@/lib/contrast";
import { DEFAULT_GROUP_COLOR } from "@/lib/db";

function PatientCard({
  patient,
  status,
  todoCount,
  bedType,
  specialType,
  onOpen,
  onMenu,
  animateEntry = true,
}: {
  patient: Patient;
  status: PatientStatus;
  todoCount: number;
  bedType?: BedType;
  specialType?: string;
  onOpen: (p: Patient) => void;
  onMenu: (p: Patient) => void;
  // 虚拟滚动场景下关闭进入动画，避免滚动时卡片反复重放动画。
  animateEntry?: boolean;
}) {
  const longPressed = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPress = () => {
    timer.current = setTimeout(() => {
      longPressed.current = true;
      onMenu(patient);
    }, 500);
  };
  const endPress = () => {
    if (timer.current) clearTimeout(timer.current);
  };

  const color = patient.groupColor || DEFAULT_GROUP_COLOR;
  const dangerBorder = status.overdue || status.needDressing;

  // 合并「传入的实时解析值」与「已持久化的字段」，确保两种来源都能标识特殊床。
  const bt = bedType ?? patient.bedType;
  const st = specialType ?? patient.specialType;
  const isVirtual = bt === "virtual";
  const isExtra = bt === "extra-real";
  const bedRingStyle = isVirtual
    ? { boxShadow: "0 0 0 2px rgb(var(--info) / 0.55)" }
    : isExtra
      ? { boxShadow: "0 0 0 2px rgb(var(--special) / 0.55)" }
      : undefined;

  const enterAnim = animateEntry
    ? {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 6 },
      }
    : {
        initial: false as const,
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`查看 ${patient.name} 详情`}
      className="block cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      onClick={(e) => {
        // 长按已触发菜单：阻止打开详情页。
        if (longPressed.current) {
          longPressed.current = false;
          e.preventDefault();
          return;
        }
        onOpen(patient);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(patient);
        }
      }}
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={endPress}
    >
      <motion.div
        {...enterAnim}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        whileTap={{ scale: 0.98 }}
        className={`card-interactive flex items-center gap-3 p-3 ${
          dangerBorder ? "border-danger/30" : ""
        }`}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold"
          style={{ backgroundColor: color, color: contrastTextColor(color), ...bedRingStyle }}
        >
          {bedBlockLabel(patient.bedNumber)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-semibold text-main">
              {patient.name}
            </span>
            {patient.group && (
              <span
                className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  backgroundColor: color + "33",
                  color: color,
                }}
              >
                {patient.group}
              </span>
            )}
          </div>
          <p className="truncate text-[12px] text-muted">{patient.diagnosis}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {todoCount > 0 && (
              <span className="badge-primary">待办 {todoCount}</span>
            )}
            {isVirtual && <span className="badge-virtual">虚拟床</span>}
            {isExtra && (
              <span className="badge-special">{st ? `加床·${st}` : "加床"}</span>
            )}
            {status.needDressing && (
              <span className="badge-danger">需换药</span>
            )}
            {status.needBlood && (
              <span className="badge-warning">需查血</span>
            )}
            {status.overdue && <span className="badge-danger">已逾期</span>}
            {status.todayDue && <span className="badge-warning">今日到期</span>}
          </div>
        </div>

        <button
          aria-label="更多操作"
          className="shrink-0 rounded-lg p-1.5 text-muted opacity-60 transition hover:bg-surface-alt hover:opacity-100"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMenu(patient);
          }}
        >
          <MoreHorizontal size={20} />
        </button>
      </motion.div>
    </div>
  );
}

// 自定义比较：仅当实际展示数据或回调引用变化时才重渲染，
// 避免父级重渲染（如勾选某待办）导致未受影响的卡片连带重渲染（memo 命中）。
function patientCardEqual(
  a: {
    patient: Patient;
    status: PatientStatus;
    todoCount: number;
    bedType?: BedType;
    specialType?: string;
    onOpen: (p: Patient) => void;
    onMenu: (p: Patient) => void;
    animateEntry?: boolean;
  },
  b: {
    patient: Patient;
    status: PatientStatus;
    todoCount: number;
    bedType?: BedType;
    specialType?: string;
    onOpen: (p: Patient) => void;
    onMenu: (p: Patient) => void;
    animateEntry?: boolean;
  }
): boolean {
  return (
    a.onOpen === b.onOpen &&
    a.onMenu === b.onMenu &&
    a.todoCount === b.todoCount &&
    a.bedType === b.bedType &&
    a.specialType === b.specialType &&
    a.animateEntry === b.animateEntry &&
    a.status.needDressing === b.status.needDressing &&
    a.status.needBlood === b.status.needBlood &&
    a.status.todayDue === b.status.todayDue &&
    a.status.overdue === b.status.overdue &&
    a.patient.id === b.patient.id &&
    a.patient.name === b.patient.name &&
    a.patient.diagnosis === b.patient.diagnosis &&
    a.patient.bedNumber === b.patient.bedNumber &&
    a.patient.group === b.patient.group &&
    a.patient.groupColor === b.patient.groupColor &&
    a.patient.bedType === b.patient.bedType &&
    a.patient.specialType === b.patient.specialType
  );
}

export default React.memo(PatientCard, patientCardEqual);
