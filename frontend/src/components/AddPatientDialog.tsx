import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { MedicalGroup, Patient } from "@/types/patient";

interface AddPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: { bedNumber: string; name: string; group: MedicalGroup }) => Promise<Patient>;
}

export default function AddPatientDialog({ open, onOpenChange, onAdd }: AddPatientDialogProps) {
  const [bedNumber, setBedNumber] = useState("");
  const [name, setName] = useState("");
  const [group, setGroup] = useState<MedicalGroup>("解组");

  const handleSubmit = async () => {
    if (!bedNumber.trim() || !name.trim()) return;
    await onAdd({ bedNumber: bedNumber.trim(), name: name.trim(), group });
    setBedNumber("");
    setName("");
    setGroup("解组");
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
            className="w-full sm:max-w-md rounded-t-xl sm:rounded-xl p-4 pb-20"
            style={{ backgroundColor: "var(--background)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                添加病人
              </h2>
              <button onClick={() => onOpenChange(false)} style={{ minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={20} style={{ color: "var(--muted-foreground)" }} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", display: "block", marginBottom: "4px" }}>床号</label>
                <input
                  type="text"
                  value={bedNumber}
                  onChange={(e) => setBedNumber(e.target.value)}
                  placeholder="如 309W11"
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
                <label style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", display: "block", marginBottom: "4px" }}>姓名</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="病人姓名"
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
                <label style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", display: "block", marginBottom: "4px" }}>医疗组</label>
                <div className="flex gap-2">
                  {(["解组", "勇组"] as MedicalGroup[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGroup(g)}
                      className="flex-1 py-2.5 rounded-md"
                      style={{
                        backgroundColor: group === g ? (g === "解组" ? "var(--theme-blue)" : "var(--theme-green)") : "var(--secondary)",
                        color: group === g ? "white" : "var(--secondary-foreground)",
                        fontSize: "var(--font-size-label)",
                        minHeight: "44px",
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              className="w-full mt-4 py-3 rounded-md"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
                fontSize: "var(--font-size-label)",
                minHeight: "48px",
              }}
            >
              确认添加
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
