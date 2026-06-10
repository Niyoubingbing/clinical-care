import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { BloodRecord } from "@/types/patient";

interface BloodRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: Omit<BloodRecord, "id">) => Promise<void>;
}

const FIELDS: { key: keyof Omit<BloodRecord, "id">; label: string }[] = [
  { key: "hb", label: "HB" },
  { key: "wbc", label: "WBC" },
  { key: "plt", label: "PLT" },
  { key: "k", label: "K" },
  { key: "na", label: "Na" },
  { key: "cr", label: "Cr" },
  { key: "alb", label: "Alb" },
  { key: "crp", label: "CRP" },
];

export default function BloodRecordDialog({ open, onOpenChange, onSave }: BloodRecordDialogProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [values, setValues] = useState<Record<string, string>>({});

  const handleSave = async () => {
    const record: Omit<BloodRecord, "id"> = { date };
    for (const field of FIELDS) {
      const v = parseFloat(values[field.key]);
      if (!isNaN(v)) {
        (record as any)[field.key] = v;
      }
    }
    await onSave(record);
    setValues({});
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
            className="w-full sm:max-w-md rounded-t-xl sm:rounded-xl p-4 max-h-[80vh] overflow-y-auto"
            style={{ backgroundColor: "var(--background)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                录入查血
              </h2>
              <button onClick={() => onOpenChange(false)} style={{ minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={20} style={{ color: "var(--muted-foreground)" }} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", display: "block", marginBottom: "4px" }}>日期</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md outline-none"
                  style={{
                    backgroundColor: "var(--muted)",
                    border: "1px solid var(--border)",
                    fontSize: "var(--font-size-label)",
                    color: "var(--foreground)",
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {FIELDS.map((field) => (
                  <div key={field.key}>
                    <label style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)", display: "block", marginBottom: "2px" }}>{field.label}</label>
                    <input
                      type="number"
                      step="any"
                      value={values[field.key] || ""}
                      onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                      placeholder={field.label}
                      className="w-full px-3 py-2.5 rounded-md outline-none"
                      style={{
                        backgroundColor: "var(--muted)",
                        border: "1px solid var(--border)",
                        fontSize: "var(--font-size-label)",
                        color: "var(--foreground)",
                      }}
                    />
                  </div>
                ))}
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
              保存记录
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
