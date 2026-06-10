import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { Patient } from "@/types/patient";

interface EditPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
  onSave: (updates: Partial<Patient>) => Promise<void>;
}

export default function EditPatientDialog({ open, onOpenChange, patient, onSave }: EditPatientDialogProps) {
  const [surgeryDate, setSurgeryDate] = useState(patient.surgeryDate || "");
  const [dressingFreq, setDressingFreq] = useState(String(patient.dressingChangeFrequency || ""));
  const [lastDressing, setLastDressing] = useState(patient.lastDressingChange || "");
  const [bloodCheckDay, setBloodCheckDay] = useState(String(patient.bloodCheckDay ?? ""));

  const handleSave = async () => {
    const updates: Partial<Patient> = {};
    if (surgeryDate) updates.surgeryDate = surgeryDate;
    else updates.surgeryDate = undefined;
    if (dressingFreq) updates.dressingChangeFrequency = parseInt(dressingFreq);
    else updates.dressingChangeFrequency = undefined;
    if (lastDressing) updates.lastDressingChange = lastDressing;
    else updates.lastDressingChange = undefined;
    if (bloodCheckDay) updates.bloodCheckDay = parseInt(bloodCheckDay);
    else updates.bloodCheckDay = undefined;
    await onSave(updates);
    onOpenChange(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="w-full sm:max-w-md rounded-t-xl sm:rounded-xl p-4"
            style={{ backgroundColor: "var(--background)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                编辑 {patient.bedNumber}
              </h2>
              <button onClick={() => onOpenChange(false)} style={{ minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={20} style={{ color: "var(--muted-foreground)" }} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", display: "block", marginBottom: "4px" }}>手术日期</label>
                <input
                  type="date"
                  value={surgeryDate}
                  onChange={(e) => setSurgeryDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md outline-none"
                  style={{
                    backgroundColor: "var(--muted)",
                    border: "1px solid var(--border)",
                    fontSize: "var(--font-size-label)",
                    color: "var(--foreground)",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", display: "block", marginBottom: "4px" }}>换药频率（天）</label>
                <input
                  type="number"
                  value={dressingFreq}
                  onChange={(e) => setDressingFreq(e.target.value)}
                  placeholder="如 3"
                  className="w-full px-3 py-2.5 rounded-md outline-none"
                  style={{
                    backgroundColor: "var(--muted)",
                    border: "1px solid var(--border)",
                    fontSize: "var(--font-size-label)",
                    color: "var(--foreground)",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", display: "block", marginBottom: "4px" }}>上次换药日期</label>
                <input
                  type="date"
                  value={lastDressing}
                  onChange={(e) => setLastDressing(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md outline-none"
                  style={{
                    backgroundColor: "var(--muted)",
                    border: "1px solid var(--border)",
                    fontSize: "var(--font-size-label)",
                    color: "var(--foreground)",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", display: "block", marginBottom: "4px" }}>查血日（周几，0=周日）</label>
                <input
                  type="number"
                  min="0"
                  max="6"
                  value={bloodCheckDay}
                  onChange={(e) => setBloodCheckDay(e.target.value)}
                  placeholder="如 1=周一"
                  className="w-full px-3 py-2.5 rounded-md outline-none"
                  style={{
                    backgroundColor: "var(--muted)",
                    border: "1px solid var(--border)",
                    fontSize: "var(--font-size-label)",
                    color: "var(--foreground)",
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full mt-4 py-3 rounded-md"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
                fontSize: "var(--font-size-label)",
                minHeight: "48px",
              }}
            >
              保存
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
