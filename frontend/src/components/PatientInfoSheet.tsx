import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePatients } from "@/hooks/use-patients";
import { toast } from "sonner";
import type { Patient } from "@/types/patient";

interface PatientInfoSheetProps { patient: Patient; open: boolean; onOpenChange: (open: boolean) => void; }

const WEEKDAYS = ["周日","周一","周二","周三","周四","周五","周六"];

export default function PatientInfoSheet({ patient, open, onOpenChange }: PatientInfoSheetProps) {
  const { updatePatient, deletePatient, restorePatient } = usePatients();
  const [surgeryDate, setSurgeryDate] = useState("");
  const [dressingFreq, setDressingFreq] = useState("");
  const [lastDressing, setLastDressing] = useState("");
  const [bloodCheckDay, setBloodCheckDay] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setSurgeryDate(patient.surgeryDate || "");
      setDressingFreq(String(patient.dressingChangeFrequency || ""));
      setLastDressing(patient.lastDressingChange || "");
      setBloodCheckDay(String(patient.bloodCheckDay ?? ""));
      setShowDelete(false);
    }
  }, [open, patient]);

  const handleSave = async () => {
    const u: Partial<Patient> = {};
    u.surgeryDate = surgeryDate || undefined;
    u.dressingChangeFrequency = dressingFreq ? parseInt(dressingFreq) : undefined;
    u.lastDressingChange = lastDressing || undefined;
    u.bloodCheckDay = bloodCheckDay ? parseInt(bloodCheckDay) : undefined;
    await updatePatient(patient.id, u);
    toast.success("信息已保存");
    onOpenChange(false);
  };

  const handleDelete = async () => {
    const copy: Patient = { ...patient };
    setShowDelete(false); onOpenChange(false);
    await deletePatient(patient.id);
    toast("已删除病人", {
      description: `${patient.bedNumber} ${patient.name}`,
      action: { label: "撤销", onClick: async () => { await restorePatient(copy); toast.success("已恢复"); } },
      duration: 6000,
    });
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

            {!showDelete ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>{patient.bedNumber}</h2>
                    <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{patient.name}</p>
                  </div>
                  <button onClick={() => onOpenChange(false)} className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-secondary transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>手术日期</label>
                    <input type="date" value={surgeryDate} onChange={(e) => setSurgeryDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl outline-none text-sm"
                      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>换药频率（天）</label>
                    <input type="number" min="1" value={dressingFreq} onChange={(e) => setDressingFreq(e.target.value)} placeholder="如 3"
                      className="w-full px-3.5 py-2.5 rounded-xl outline-none text-sm"
                      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>上次换药</label>
                    <input type="date" value={lastDressing} onChange={(e) => setLastDressing(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl outline-none text-sm"
                      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>查血日</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {WEEKDAYS.map((d, i) => (
                        <button key={i} onClick={() => setBloodCheckDay(String(i))}
                          className="px-3 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-transform"
                          style={{
                            backgroundColor: bloodCheckDay === String(i) ? "var(--primary)" : "var(--card)",
                            color: bloodCheckDay === String(i) ? "var(--primary-foreground)" : "var(--muted-foreground)",
                            border: bloodCheckDay === String(i) ? "1px solid var(--primary)" : "1px solid var(--border)",
                          }}>{d}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-5">
                  <button onClick={handleSave}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
                    style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)", boxShadow: "0 2px 8px rgba(13,148,136,0.25)" }}>保存</button>
                  <button onClick={() => setShowDelete(true)}
                    className="px-5 py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
                    style={{ backgroundColor: "#fef2f2", color: "var(--destructive)", border: "1px solid #fecaca" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1.5"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    删除
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>确认删除</h2>
                <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
                  删除 {patient.bedNumber} {patient.name}？6 秒内可通过 toast 撤回。
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setShowDelete(false)}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm"
                    style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)" }}>取消</button>
                  <button onClick={handleDelete}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm"
                    style={{ backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)" }}>确认删除</button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
