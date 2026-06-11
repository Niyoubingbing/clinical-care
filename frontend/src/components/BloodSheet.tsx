import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePatients } from "@/hooks/use-patients";
import { toast } from "sonner";
import type { Patient, BloodRecord } from "@/types/patient";

interface BloodSheetProps { patient: Patient; open: boolean; onOpenChange: (open: boolean) => void; }

const FIELDS: { key: keyof Omit<BloodRecord, "id">; label: string; placeholder: string }[] = [
  { key: "hb", label: "HB", placeholder: "120" },
  { key: "wbc", label: "WBC", placeholder: "6.0" },
  { key: "plt", label: "PLT", placeholder: "200" },
  { key: "k", label: "K", placeholder: "4.0" },
  { key: "na", label: "Na", placeholder: "140" },
  { key: "cr", label: "Cr", placeholder: "80" },
  { key: "alb", label: "Alb", placeholder: "40" },
  { key: "crp", label: "CRP", placeholder: "5" },
];

export default function BloodSheet({ patient, open, onOpenChange }: BloodSheetProps) {
  const { addBloodRecord } = usePatients();
  const [date, setDate] = useState("");
  const [values, setValues] = useState<Record<string,string>>({});
  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDate(new Date().toISOString().slice(0,10));
      setValues({});
      setTimeout(() => dateRef.current?.focus(), 150);
    }
  }, [open]);

  const handleSave = async () => {
    const record: any = { date };
    let hasValue = false;
    for (const f of FIELDS) { const v = parseFloat(values[f.key]); if (!isNaN(v)) { record[f.key] = v; hasValue = true; } }
    if (!hasValue) { toast.error("请至少录入一项"); return; }
    await addBloodRecord(patient.id, record);
    toast.success(`${patient.bedNumber} 查血已保存`);
    onOpenChange(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: "rgba(15,23,42,0.35)", backdropFilter: "blur(2px)" }}
          onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="w-full max-h-[85vh] overflow-y-auto rounded-t-2xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
            style={{ backgroundColor: "var(--background)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>{patient.bedNumber} · 查血</h2>
              <button onClick={() => onOpenChange(false)} className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-secondary transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>检验日期</label>
              <input ref={dateRef} type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl outline-none text-sm"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {FIELDS.map((f) => (
                <div key={f.key} className="flex flex-col">
                  <label className="text-[10px] font-semibold mb-1 text-center uppercase" style={{ color: "var(--muted-foreground)" }}>{f.label}</label>
                  <input type="number" step="any" value={values[f.key] || ""}
                    onChange={(e) => setValues({...values, [f.key]: e.target.value})} placeholder={f.placeholder}
                    className="w-full px-2 py-2.5 rounded-xl outline-none text-center text-sm font-medium"
                    style={{ backgroundColor: "var(--card)", border: `1.5px solid ${values[f.key] ? "var(--primary)" : "var(--border)"}`, color: "var(--foreground)" }} />
                </div>
              ))}
            </div>

            <button onClick={handleSave}
              className="w-full py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
              style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)", boxShadow: "0 2px 8px rgba(13,148,136,0.25)" }}>
              保存记录
            </button>

            {patient.bloodRecords.length > 0 && (
              <div className="mt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
                  历史 ({patient.bloodRecords.length})
                </h3>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {[...patient.bloodRecords].reverse().map((r, i) => (
                    <div key={r.id} className="px-3 py-2 rounded-xl text-xs" style={{ backgroundColor: i === 0 ? "var(--secondary)" : "transparent" }}>
                      <span className="font-semibold mr-2" style={{ color: "var(--foreground)" }}>{r.date}</span>
                      <span style={{ color: "var(--muted-foreground)" }}>
                        {["hb","wbc","plt","k","na","cr","alb","crp"].map((k) => {
                          const v = (r as any)[k];
                          return v !== undefined ? `${k.toUpperCase()} ${v} ` : "";
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
