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
}: {
  items: GroupedItem[];
  bedInfoMap?: Map<string, BedInfo>;
  onOpen: (p: Patient) => void;
  onMenu: (p: Patient) => void;
}) {
  if (items.length === 0) return null;
  // 病房块：与单卡（白底 card）区分——采用彩色玻璃质感容器，
  // 主色→信息色渐变半透明底 + 磨砂模糊 + 左侧强调色条，内部白色病人卡「浮」其上。
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="relative overflow-hidden rounded-2xl border p-2"
      style={{
        background:
          "linear-gradient(135deg, rgb(var(--primary) / 0.10) 0%, rgb(var(--info) / 0.06) 100%)",
        borderColor: "rgb(var(--primary) / 0.25)",
        boxShadow: "0 2px 12px rgb(var(--primary) / 0.07)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
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
            />
          );
        })}
      </div>
    </motion.div>
  );
}

export default React.memo(GroupedPatientCard);
