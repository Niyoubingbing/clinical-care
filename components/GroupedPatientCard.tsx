"use client";

import React from "react";
import { motion } from "framer-motion";
import { Patient, BedType } from "@/types";
import { PatientStatus } from "@/lib/reminders";
import PatientCard from "@/components/PatientCard";

export interface GroupedItem {
  patient: Patient;
  todoCount: number;
  status: PatientStatus;
}

export type BedInfo = { bedType?: BedType; specialType?: string };

function GroupedPatientCard({
  items,
  bedInfoMap,
  onOpen,
  onMenu,
  animateEntry = true,
}: {
  items: GroupedItem[];
  bedInfoMap?: Map<string, BedInfo>;
  onOpen: (p: Patient) => void;
  onMenu: (p: Patient) => void;
  // 虚拟滚动场景下关闭进入动画，避免滚动时卡片反复重放动画。
  animateEntry?: boolean;
}) {
  if (items.length === 0) return null;
  // 病房块：与单卡（白底 card）区分——采用主色→信息色柔和渐变底 + 1px 发丝边框 +
  // 克制阴影 + 左侧强调色条，内部白色病人卡「浮」其上。无磨砂模糊（干净 Claude 风格）。
  const enterAnim = animateEntry
    ? { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } }
    : { initial: false as const, animate: { opacity: 1 } };
  return (
    <motion.div
      {...enterAnim}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="relative overflow-hidden rounded-2xl border p-2"
      style={{
        background:
          "linear-gradient(135deg, rgb(var(--primary) / 0.10) 0%, rgb(var(--info) / 0.06) 100%)",
        borderColor: "rgb(var(--primary) / 0.25)",
        boxShadow: "0 2px 12px rgb(var(--primary) / 0.07)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-full w-1"
        style={{
          background:
            "linear-gradient(to bottom, rgb(var(--primary) / 0.75), rgb(var(--info) / 0.5))",
        }}
      />
      <div className="space-y-2 pl-1">
        {items.map((it) => {
          const info = bedInfoMap?.get(it.patient.id);
          return (
            <PatientCard
              key={it.patient.id}
              patient={it.patient}
              todoCount={it.todoCount}
              status={it.status}
              bedType={info?.bedType}
              specialType={info?.specialType}
              onOpen={onOpen}
              onMenu={onMenu}
              animateEntry={animateEntry}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

// 自定义比较：当分组内病人数据或回调引用未变化时，外层分组卡命中 memo，
// 连同内层 PatientCard 一起跳过重渲染（勾选某待办时仅该待办所属病人卡重渲染）。
function groupedEqual(
  a: {
    items: GroupedItem[];
    bedInfoMap?: Map<string, BedInfo>;
    onOpen: (p: Patient) => void;
    onMenu: (p: Patient) => void;
    animateEntry?: boolean;
  },
  b: {
    items: GroupedItem[];
    bedInfoMap?: Map<string, BedInfo>;
    onOpen: (p: Patient) => void;
    onMenu: (p: Patient) => void;
    animateEntry?: boolean;
  }
): boolean {
  if (a.onOpen !== b.onOpen) return false;
  if (a.onMenu !== b.onMenu) return false;
  if (a.bedInfoMap !== b.bedInfoMap) return false;
  if (a.animateEntry !== b.animateEntry) return false;
  if (a.items.length !== b.items.length) return false;
  for (let i = 0; i < a.items.length; i++) {
    const x = a.items[i];
    const y = b.items[i];
    if (x.patient.id !== y.patient.id) return false;
    if (x.todoCount !== y.todoCount) return false;
    if (x.patient.name !== y.patient.name) return false;
    if (x.patient.diagnosis !== y.patient.diagnosis) return false;
    if (x.patient.bedNumber !== y.patient.bedNumber) return false;
    if (x.patient.group !== y.patient.group) return false;
    if (x.patient.groupColor !== y.patient.groupColor) return false;
    const sx = x.status;
    const sy = y.status;
    if (sx.needDressing !== sy.needDressing) return false;
    if (sx.needBlood !== sy.needBlood) return false;
    if (sx.todayDue !== sy.todayDue) return false;
    if (sx.overdue !== sy.overdue) return false;
  }
  return true;
}

export default React.memo(GroupedPatientCard, groupedEqual);
