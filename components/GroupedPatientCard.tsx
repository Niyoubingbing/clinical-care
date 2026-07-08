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
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="card overflow-hidden p-3"
    >
      <div className="space-y-2">
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
