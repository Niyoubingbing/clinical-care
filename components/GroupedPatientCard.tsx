"use client";

import { motion } from "framer-motion";
import { Patient } from "@/types";
import { PatientStatus } from "@/lib/reminders";
import PatientCard from "@/components/PatientCard";

export interface GroupedItem {
  patient: Patient;
  todoCount: number;
  status: PatientStatus;
}

export default function GroupedPatientCard({
  label,
  items,
  onOpen,
  onMenu,
}: {
  label: string;
  items: GroupedItem[];
  onOpen: (p: Patient) => void;
  onMenu: (p: Patient) => void;
}) {
  if (items.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="card overflow-hidden p-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-primary">{label}</span>
        <span className="text-[11px] text-muted">{items.length} 床</span>
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <PatientCard
            key={it.patient.id}
            patient={it.patient}
            todoCount={it.todoCount}
            status={it.status}
            onOpen={onOpen}
            onMenu={onMenu}
          />
        ))}
      </div>
    </motion.div>
  );
}
