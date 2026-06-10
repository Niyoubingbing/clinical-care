import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
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
  const [errors, setErrors] = useState<{ bedNumber?: string; name?: string }>({});
  const bedRef = useRef<HTMLInputElement>(null);

  // Reset and auto-focus
  useEffect(() => {
    if (open) {
      setBedNumber("");
      setName("");
      setGroup("解组");
      setErrors({});
      setTimeout(() => bedRef.current?.focus(), 150);
    }
  }, [open]);

  const validate = () => {
    const e: { bedNumber?: string; name?: string } = {};
    if (!bedNumber.trim()) e.bedNumber = "请输入床号";
    if (!name.trim()) e.name = "请输入姓名";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onAdd({ bedNumber: bedNumber.trim(), name: name.trim(), group });
    toast.success(`已添加 ${bedNumber.trim()} ${name.trim()}`);
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
                添加病人
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
                <label
                  className="block mb-1"
                  style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}
                >
                  床号 <span style={{ color: "var(--destructive)" }}>*</span>
                </label>
                <input
                  ref={bedRef}
                  type="text"
                  value={bedNumber}
                  onChange={(e) => { setBedNumber(e.target.value); setErrors((p) => ({ ...p, bedNumber: undefined })); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="如 309W11"
                  className="w-full px-3 py-2.5 rounded-lg outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--muted)",
                    border: `1.5px solid ${errors.bedNumber ? "var(--destructive)" : bedNumber.trim() ? "var(--primary)" : "var(--border)"}`,
                    fontSize: "var(--font-size-label)",
                    color: "var(--foreground)",
                  }}
                />
                {errors.bedNumber && (
                  <span style={{ fontSize: "var(--font-size-small)", color: "var(--destructive)", marginTop: "4px", display: "block" }}>
                    {errors.bedNumber}
                  </span>
                )}
              </div>

              <div>
                <label
                  className="block mb-1"
                  style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}
                >
                  姓名 <span style={{ color: "var(--destructive)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="病人姓名"
                  className="w-full px-3 py-2.5 rounded-lg outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--muted)",
                    border: `1.5px solid ${errors.name ? "var(--destructive)" : name.trim() ? "var(--primary)" : "var(--border)"}`,
                    fontSize: "var(--font-size-label)",
                    color: "var(--foreground)",
                  }}
                />
                {errors.name && (
                  <span style={{ fontSize: "var(--font-size-small)", color: "var(--destructive)", marginTop: "4px", display: "block" }}>
                    {errors.name}
                  </span>
                )}
              </div>

              <div>
                <label
                  className="block mb-1"
                  style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}
                >
                  医疗组
                </label>
                <div className="flex gap-2">
                  {(["解组", "勇组"] as MedicalGroup[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGroup(g)}
                      className="flex-1 py-2.5 rounded-lg transition-all active:scale-[0.98]"
                      style={{
                        backgroundColor: group === g
                          ? g === "解组" ? "var(--theme-blue)" : "var(--theme-green)"
                          : "var(--secondary)",
                        color: group === g ? "white" : "var(--secondary-foreground)",
                        fontSize: "var(--font-size-label)",
                        fontWeight: "var(--font-weight-medium)",
                        minHeight: "44px",
                        boxShadow: group === g ? "var(--ds-shadow-sm)" : "none",
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
              className="w-full mt-4 py-3 rounded-lg transition-transform active:scale-[0.98]"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
                fontSize: "var(--font-size-label)",
                fontWeight: "var(--font-weight-medium)",
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
