import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { BloodRecord } from "@/types/patient";

interface BloodRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: Omit<BloodRecord, "id">) => Promise<void>;
}

const FIELD_GROUPS = [
  {
    label: "血常规",
    fields: [
      { key: "hb" as const, label: "HB", placeholder: "120", unit: "g/L" },
      { key: "wbc" as const, label: "WBC", placeholder: "6.0", unit: "×10⁹/L" },
      { key: "plt" as const, label: "PLT", placeholder: "200", unit: "×10⁹/L" },
    ],
  },
  {
    label: "电解质",
    fields: [
      { key: "k" as const, label: "K", placeholder: "4.0", unit: "mmol/L" },
      { key: "na" as const, label: "Na", placeholder: "140", unit: "mmol/L" },
    ],
  },
  {
    label: "生化",
    fields: [
      { key: "cr" as const, label: "Cr", placeholder: "80", unit: "μmol/L" },
      { key: "alb" as const, label: "Alb", placeholder: "40", unit: "g/L" },
      { key: "crp" as const, label: "CRP", placeholder: "5", unit: "mg/L" },
    ],
  },
];

export default function BloodRecordDialog({ open, onOpenChange, onSave }: BloodRecordDialogProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [values, setValues] = useState<Record<string, string>>({});

  const handleSave = async () => {
    const record: any = { date };
    for (const group of FIELD_GROUPS) {
      for (const field of group.fields) {
        const v = parseFloat(values[field.key]);
        if (!isNaN(v)) record[field.key] = v;
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
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="w-full sm:max-w-md rounded-t-xl sm:rounded-xl p-4 pb-20 max-h-[85vh] overflow-y-auto"
            style={{ backgroundColor: "var(--background)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                录入查血
              </h2>
              <button onClick={() => onOpenChange(false)}
                style={{ minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={20} style={{ color: "var(--muted-foreground)" }} />
              </button>
            </div>

            <div className="mb-3">
              <label style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)", display: "block", marginBottom: "2px" }}>
                检验日期
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg outline-none"
                style={{
                  backgroundColor: "var(--muted)",
                  border: "1px solid var(--border)",
                  fontSize: "var(--font-size-label)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            <div className="space-y-3">
              {FIELD_GROUPS.map((group) => (
                <div key={group.label}>
                  <label
                    className="block mb-1.5"
                    style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)", fontWeight: "var(--font-weight-medium)", textTransform: "uppercase", letterSpacing: "0.05em" }}
                  >
                    {group.label}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {group.fields.map((field) => (
                      <div key={field.key}>
                        <label
                          className="block mb-1"
                          style={{ fontSize: "11px", color: "var(--muted-foreground)" }}
                        >
                          {field.label}
                          <span style={{ fontSize: "10px", opacity: 0.5, marginLeft: "2px" }}>{field.unit}</span>
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={values[field.key] || ""}
                          onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                          className="w-full px-2 py-2 rounded-lg outline-none text-center"
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
              ))}
            </div>

            <button
              onClick={handleSave}
              className="w-full mt-4 py-3 rounded-lg"
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
