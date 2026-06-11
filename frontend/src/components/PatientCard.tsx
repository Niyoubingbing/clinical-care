import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { usePatients } from "@/hooks/use-patients";
import { useReminders } from "@/hooks/use-reminders";
import { toast } from "sonner";
import type { Patient, Todo } from "@/types/patient";
import BloodSheet from "@/components/BloodSheet";
import PatientInfoSheet from "@/components/PatientInfoSheet";

interface PatientCardProps {
  patient: Patient;
}

const DEFAULT_QUICK_TODOS: { label: string; type: Todo["type"] }[] = [
  { label: "换药", type: "换药" },
  { label: "开术前", type: "开术前" },
  { label: "明天出院", type: "明天出院" },
  { label: "会诊", type: "会诊" },
  { label: "复查", type: "复查" },
];

export default function PatientCard({ patient }: PatientCardProps) {
  const { updatePatient, addTodo, toggleTodo, deleteTodo } = usePatients();
  const { getBloodAlert } = useReminders();
  const customQuickTodos = useAppStore((s) => s.customQuickTodos);
  const [showBlood, setShowBlood] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [customTodo, setCustomTodo] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [dismissedAlert, setDismissedAlert] = useState(false);

  const bloodAlert = getBloodAlert(patient);
  const pendingTodos = patient.todos.filter((t) => !t.completed);
  const completedTodos = patient.todos.filter((t) => t.completed);
  const latestBlood = patient.bloodRecords.length > 0 ? patient.bloodRecords[patient.bloodRecords.length - 1] : null;
  const daysSinceDressing = patient.lastDressingChange
    ? Math.floor((Date.now() - new Date(patient.lastDressingChange).getTime()) / 86400000)
    : null;
  const dressingOverdue = patient.dressingChangeFrequency && daysSinceDressing !== null
    && daysSinceDressing >= patient.dressingChangeFrequency;

  // Merge default + custom quick todos
  const allQuickTodos = [
    ...DEFAULT_QUICK_TODOS,
    ...customQuickTodos.map((label) => ({ label, type: "其他" as Todo["type"] })),
  ];

  const handleQuickTodo = async (label: string, type: Todo["type"]) => {
    const exists = patient.todos.some((t) => t.content === label && !t.completed);
    if (exists) {
      toast("该待办已存在");
      return;
    }
    await addTodo(patient.id, label, type);
  };

  const handleCustomTodo = async () => {
    if (!customTodo.trim()) return;
    await addTodo(patient.id, customTodo.trim(), "其他");
    setCustomTodo("");
  };

  const handleToggleTodo = async (todoId: string) => {
    const todo = patient.todos.find((t) => t.id === todoId);
    await toggleTodo(patient.id, todoId);
    if (todo && (todo.type === "换药" || todo.content === "换药") && !todo.completed) {
      const today = new Date().toISOString().slice(0, 10);
      await updatePatient(patient.id, { lastDressingChange: today });
      toast.success("换药日期已自动更新");
    }
  };

  return (
    <div className="h-full flex flex-col px-4 py-3 overflow-y-auto scrollbar-hide gap-3">
      {/* ═══════ Header ═══════ */}
      <motion.div
        className="animate-fade-in-up flex items-start justify-between"
        key={patient.id + "-header"}
      >
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
              {patient.bedNumber}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{
                backgroundColor: patient.group === "解组" ? "rgba(59,130,246,0.12)" : "rgba(16,185,129,0.12)",
                color: patient.group === "解组" ? "var(--info)" : "var(--success)",
              }}
            >
              {patient.group}
            </span>
          </div>
          <p className="text-base mt-0.5 font-medium" style={{ color: "var(--muted-foreground)" }}>
            {patient.name}
          </p>
        </div>
        <button
          onClick={() => setShowInfo(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </motion.div>

      {/* ═══════ Alerts ═══════ */}
      {!dismissedAlert && bloodAlert && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
          style={{
            backgroundColor: bloodAlert.level === "danger" ? "#fef2f2" : "#fffbeb",
            border: `1px solid ${bloodAlert.level === "danger" ? "#fecaca" : "#fde68a"}`,
            color: bloodAlert.level === "danger" ? "#991b1b" : "#92400e",
            fontSize: "var(--font-size-label)",
          }}
        >
          <span className="text-base">🩸</span>
          <span className="flex-1 font-medium">查血已超 <b>{bloodAlert.days}</b> 天，建议尽快查血</span>
          <button onClick={() => setDismissedAlert(true)} className="text-lg leading-none opacity-40 hover:opacity-70">&times;</button>
        </motion.div>
      )}

      {!dismissedAlert && dressingOverdue && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
          style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            color: "#92400e",
            fontSize: "var(--font-size-label)",
          }}
        >
          <span className="text-base">🩹</span>
          <span className="flex-1 font-medium">换药已超 <b>{daysSinceDressing}</b> 天</span>
          <button onClick={() => setDismissedAlert(true)} className="text-lg leading-none opacity-40 hover:opacity-70">&times;</button>
        </motion.div>
      )}

      {/* ═══════ Blood summary ═══════ */}
      {latestBlood && (
        <div
          className="rounded-2xl p-4"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card-css)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              最新查血
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)", fontSize: "11px" }}>
                {latestBlood.date.slice(5)}
              </span>
              <button onClick={() => setShowBlood(true)} className="text-xs font-semibold px-2.5 py-1 rounded-full active:scale-95 transition-transform"
                style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)", fontSize: "11px" }}>
                录入
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-x-1 gap-y-2">
            {(["hb","wbc","plt","k","na","cr","alb","crp"] as const).map((key) => {
              const val = latestBlood[key];
              if (val === undefined) return null;
              const labels: Record<string,string> = { hb:"HB", wbc:"WBC", plt:"PLT", k:"K", na:"Na", cr:"Cr", alb:"Alb", crp:"CRP" };
              const isCritical =
                (key === "hb" && val < 70) || (key === "wbc" && val > 12) ||
                (key === "plt" && (val < 50 || val > 450)) ||
                (key === "k" && (val < 3.0 || val > 5.5)) ||
                (key === "na" && (val < 130 || val > 150));
              return (
                <div key={key} className="flex flex-col items-center py-1 rounded-lg"
                  style={{
                    backgroundColor: isCritical ? "#fef2f2" : "transparent",
                  }}>
                  <span style={{ fontSize: "10px", color: isCritical ? "#b91c1c" : "var(--muted-foreground)", fontWeight: "var(--font-weight-medium)" }}>{labels[key]}</span>
                  <span style={{ fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-bold)", color: isCritical ? "#b91c1c" : "var(--foreground)" }}>{val}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════ Quick actions ═══════ */}
      <div
        className="rounded-2xl p-4"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card-css)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold uppercase tracking-wider" style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}>
            快捷操作
          </span>
          <button
            onClick={() => setShowBlood(true)}
            className="text-xs font-semibold px-2.5 py-1 rounded-full active:scale-95 transition-transform"
            style={{
              backgroundColor: latestBlood ? "var(--secondary)" : "var(--primary)",
              color: latestBlood ? "var(--secondary-foreground)" : "var(--primary-foreground)",
              fontSize: "11px",
            }}
          >
            {latestBlood ? "再次查血" : "录入查血"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {allQuickTodos.map((item) => {
            const exists = patient.todos.some((t) => t.content === item.label && !t.completed);
            return (
              <button
                key={item.label}
                onClick={() => handleQuickTodo(item.label, item.type)}
                className="px-3 py-2 rounded-xl font-medium active:scale-95 transition-all text-sm"
                style={{
                  backgroundColor: exists ? "#d1fae5" : "var(--secondary)",
                  color: exists ? "#065f46" : "var(--secondary-foreground)",
                  fontSize: "var(--font-size-label)",
                  border: exists ? "1px solid #6ee7b7" : "1px solid transparent",
                }}
              >
                {exists ? "✓ " : "+ "}{item.label}
              </button>
            );
          })}
          {pendingTodos.length > 0 && (
            <span style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)", display: "flex", alignItems: "center", paddingLeft: "4px" }}>
              {pendingTodos.length}项
            </span>
          )}
        </div>
      </div>

      {/* ═══════ Custom todo input ═══════ */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="添加自定义待办..."
          value={customTodo}
          onChange={(e) => setCustomTodo(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCustomTodo(); }}
          className="flex-1 px-3.5 py-3 rounded-xl outline-none transition-all"
          style={{
            backgroundColor: "var(--card)",
            border: `1.5px solid ${customTodo.trim() ? "var(--primary)" : "var(--border)"}`,
            fontSize: "var(--font-size-label)",
            color: "var(--foreground)",
            boxShadow: customTodo.trim() ? "0 0 0 3px rgba(13,148,136,0.1)" : "none",
          }}
        />
        <button
          onClick={handleCustomTodo}
          className="px-5 py-3 rounded-xl font-semibold active:scale-95 transition-all"
          style={{
            backgroundColor: customTodo.trim() ? "var(--primary)" : "var(--secondary)",
            color: customTodo.trim() ? "var(--primary-foreground)" : "var(--muted-foreground)",
            fontSize: "var(--font-size-label)",
            boxShadow: customTodo.trim() ? "0 2px 8px rgba(13,148,136,0.25)" : "none",
          }}
        >
          添加
        </button>
      </div>

      {/* ═══════ Active todos ═══════ */}
      {pendingTodos.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card-css)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse-glow" style={{ backgroundColor: "var(--warning)" }} />
            <span className="font-semibold uppercase tracking-wider" style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}>
              待办事项 · {pendingTodos.length}
            </span>
          </div>
          <div className="space-y-1.5">
            <AnimatePresence>
              {pendingTodos.map((todo) => (
                <motion.div
                  key={todo.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 p-3 rounded-xl group transition-colors"
                  style={{ backgroundColor: "var(--secondary)" }}
                >
                  <button
                    onClick={() => handleToggleTodo(todo.id)}
                    className="w-5 h-5 rounded-full border-[1.5px] flex-shrink-0 active:scale-90 transition-transform"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <span className="flex-1 font-medium" style={{ fontSize: "var(--font-size-label)", color: "var(--foreground)" }}>
                    {todo.content}
                  </span>
                  {todo.type && todo.type !== "其他" && (
                    <span className="px-1.5 py-0.5 rounded-md font-medium" style={{
                      backgroundColor: "var(--card)",
                      color: "var(--muted-foreground)",
                      fontSize: "10px",
                      border: "1px solid var(--border)",
                    }}>
                      {todo.type}
                    </span>
                  )}
                  <button
                    onClick={() => deleteTodo(patient.id, todo.id)}
                    className="p-1.5 rounded-lg opacity-40 active:opacity-100 active:bg-red-50 transition-all"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ═══════ Completed todos ═══════ */}
      {completedTodos.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 w-full py-2.5 px-1 rounded-lg text-sm font-medium"
            style={{ color: "var(--muted-foreground)", fontSize: "var(--font-size-label)" }}
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: "transform 0.2s ease", transform: showCompleted ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            已完成 ({completedTodos.length})
          </button>
          <AnimatePresence>
            {showCompleted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1 pl-1"
              >
                {completedTodos.map((todo) => (
                  <div key={todo.id} className="flex items-center gap-3 p-2.5 rounded-xl opacity-60" style={{ backgroundColor: "var(--secondary)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span className="flex-1 line-through text-sm" style={{ fontSize: "var(--font-size-label)" }}>{todo.content}</span>
                    {todo.completedAt && (
                      <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>{todo.completedAt.slice(5,10)}</span>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="h-4 flex-shrink-0" />

      <BloodSheet patient={patient} open={showBlood} onOpenChange={setShowBlood} />
      <PatientInfoSheet patient={patient} open={showInfo} onOpenChange={setShowInfo} />
    </div>
  );
}
