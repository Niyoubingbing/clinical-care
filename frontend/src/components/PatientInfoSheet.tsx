import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePatients } from "@/hooks/use-patients";
import { toast } from "sonner";
import type { Patient } from "@/types/patient";

interface PatientInfoSheetProps {
  patient: Patient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
    const updates: Partial<Patient> = {};
    if (surgeryDate) updates.surgeryDate = surgeryDate; else updates.surgeryDate = undefined;
    if (dressingFreq) updates.dressingChangeFrequency = parseInt(dressingFreq); else updates.dressingChangeFrequency = undefined;
    if (lastDressing) updates.lastDressingChange = lastDressing; else updates.lastDressingChange = undefined;
    if (bloodCheckDay) updates.bloodCheckDay = parseInt(bloodCheckDay); else updates.bloodCheckDay = undefined;
    await updatePatient(patient.id, updates);
    toast.success("信息已保存");
    onOpenChange(false);
  };

  const handleDelete = async () => {
    const copy: Patient = { ...patient };
    setShowDelete(false);
    onOpenChange(false);
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
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
          onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
        >
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 250 }}
            className="w-full max-h-[85vh] overflow-y-auto rounded-t-2xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
            style={{ backgroundColor: "var(--background)" }}
          >
            {!showDelete ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                    {patient.bedNumber} {patient.name}
                  </h2>
                  <button onClick={() => onOpenChange(false)} className="w-10 h-10 flex items-center justify-center rounded-lg ripple">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block mb-1" style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}>手术日期</label>
                    <input type="date" value={surgeryDate} onChange={(e) => setSurgeryDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg outline-none"
                      style={{ backgroundColor: "var(--muted)", border: "1px solid var(--border)", fontSize: "var(--font-size-label)", color: "var(--foreground)" }}
                    />
                  </div>
                  <div>
                    <label className="block mb-1" style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}>换药频率（天）</label>
                    <input type="number" min="1" value={dressingFreq} onChange={(e) => setDressingFreq(e.target.value)} placeholder="如 3"
                      className="w-full px-3 py-2.5 rounded-lg outline-none"
                      style={{ backgroundColor: "var(--muted)", border: "1px solid var(--border)", fontSize: "var(--font-size-label)", color: "var(--foreground)" }}
                    />
                  </div>
                  <div>
                    <label className="block mb-1" style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}>上次换药</label>
                    <input type="date" value={lastDressing} onChange={(e) => setLastDressing(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg outline-none"
                      style={{ backgroundColor: "var(--muted)", border: "1px solid var(--border)", fontSize: "var(--font-size-label)", color: "var(--foreground)" }}
                    />
                  </div>
                  <div>
                    <label className="block mb-1" style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}>查血日</label>
                    <div className="flex gap-1 flex-wrap">
                      {WEEKDAYS.map((d, i) => (
                        <button key={i} onClick={() => setBloodCheckDay(String(i))}
                          className="px-2 py-1 rounded-full text-xs font-medium ripple active:scale-95 transition-transform"
                          style={{
                            backgroundColor: bloodCheckDay === String(i) ? "var(--primary)" : "var(--secondary)",
                            color: bloodCheckDay === String(i) ? "var(--primary-foreground)" : "var(--secondary-foreground)",
                            fontSize: "var(--font-size-small)",
                          }}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button onClick={handleSave}
                    className="flex-1 py-3 rounded-xl font-medium ripple active:scale-[0.98] transition-transform"
                    style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)", fontSize: "var(--font-size-label)" }}>
                    保存
                  </button>
                  <button onClick={() => setShowDelete(true)}
                    className="px-4 py-3 rounded-xl font-medium ripple active:scale-[0.98] transition-transform"
                    style={{ backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)", fontSize: "var(--font-size-label)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="inline mr-1"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    删除
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="mb-2" style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                  确认删除
                </h2>
                <p className="mb-4" style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}>
                  确定删除 {patient.bedNumber} {patient.name}？6 秒内可通过 toast 撤回。
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setShowDelete(false)}
                    className="flex-1 py-3 rounded-xl font-medium"
                    style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)", fontSize: "var(--font-size-label)" }}>
                    取消
                  </button>
                  <button onClick={handleDelete}
                    className="flex-1 py-3 rounded-xl font-medium"
                    style={{ backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)", fontSize: "var(--font-size-label)" }}>
                    确认删除
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
