import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { Patient } from "@/types/patient";

interface EditPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
  onSave: (updates: Partial<Patient>) => Promise<void>;
}

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export default function EditPatientDialog({ open, onOpenChange, patient, onSave }: EditPatientDialogProps) {
  const [surgeryDate, setSurgeryDate] = useState("");
  const [dressingFreq, setDressingFreq] = useState("");
  const [lastDressing, setLastDressing] = useState("");
  const [bloodCheckDay, setBloodCheckDay] = useState("");
  const firstRef = useRef<HTMLInputElement>(null);

  // Reset from patient when dialog opens
  useEffect(() => {
    if (open) {
      setSurgeryDate(patient.surgeryDate || "");
      setDressingFreq(String(patient.dressingChangeFrequency || ""));
      setLastDressing(patient.lastDressingChange || "");
      setBloodCheckDay(String(patient.bloodCheckDay ?? ""));
      setTimeout(() => firstRef.current?.focus(), 150);
    }
  }, [open, patient]);

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
    toast.success(`${patient.bedNumber} 信息已更新`);
    onOpenChange(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="w-full sm:max-w-md rounded-t-xl sm:rounded-xl p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
            style={{ backgroundColor: "var(--background)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                编辑 {patient.bedNumber}
              </h2>
              <button
                onClick={() => onOpenChange(false)}
                className="flex items-center justify-center rounded-lg active:bg-muted transition-colors"
                style={{ width: "44px", height: "44px" }}
              >
                <X size={20} style={{ color: "var(--muted-foreground)" }} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block mb-1" style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}>
                  手术日期
                </label>
                <input
                  ref={firstRef}
                  type="date"
                  value={surgeryDate}
                  onChange={(e) => setSurgeryDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--muted)",
                    border: `1.5px solid ${surgeryDate ? "var(--primary)" : "var(--border)"}`,
                    fontSize: "var(--font-size-label)",
                    color: "var(--foreground)",
                  }}
                />
              </div>

              <div>
                <label className="block mb-1" style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}>
                  换药频率（天）
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={dressingFreq}
                  onChange={(e) => setDressingFreq(e.target.value)}
                  placeholder="如 3"
                  className="w-full px-3 py-2.5 rounded-lg outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--muted)",
                    border: `1.5px solid ${dressingFreq ? "var(--primary)" : "var(--border)"}`,
                    fontSize: "var(--font-size-label)",
                    color: "var(--foreground)",
                  }}
                />
              </div>

              <div>
                <label className="block mb-1" style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}>
                  上次换药日期
                </label>
                <input
                  type="date"
                  value={lastDressing}
                  onChange={(e) => setLastDressing(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--muted)",
                    border: `1.5px solid ${lastDressing ? "var(--primary)" : "var(--border)"}`,
                    fontSize: "var(--font-size-label)",
                    color: "var(--foreground)",
                  }}
                />
              </div>

              <div>
                <label className="block mb-1" style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}>
                  查血日
                </label>
                <div className="flex gap-1 mb-2 flex-wrap">
                  {WEEKDAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      onClick={() => setBloodCheckDay(String(i))}
                      className="px-2 py-1 rounded-full text-xs transition-all"
                      style={{
                        backgroundColor: bloodCheckDay === String(i) ? "var(--primary)" : "var(--secondary)",
                        color: bloodCheckDay === String(i) ? "var(--primary-foreground)" : "var(--secondary-foreground)",
                        fontSize: "var(--font-size-small)",
                        minHeight: "28px",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full mt-4 py-3 rounded-lg transition-transform active:scale-[0.98]"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
                fontSize: "var(--font-size-label)",
                fontWeight: "var(--font-weight-medium)",
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
