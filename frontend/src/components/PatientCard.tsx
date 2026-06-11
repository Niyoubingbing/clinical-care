import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePatients } from "@/hooks/use-patients";
import { useReminders } from "@/hooks/use-reminders";
import { toast } from "sonner";
import type { Patient, Todo } from "@/types/patient";
import BloodSheet from "@/components/BloodSheet";
import PatientInfoSheet from "@/components/PatientInfoSheet";

interface PatientCardProps {
  patient: Patient;
}

const QUICK_TODOS: { label: string; type: Todo["type"] }[] = [
  { label: "换药", type: "换药" },
  { label: "开术前", type: "开术前" },
  { label: "明天出院", type: "明天出院" },
  { label: "会诊", type: "会诊" },
  { label: "复查", type: "复查" },
];

export default function PatientCard({ patient }: PatientCardProps) {
  const { updatePatient, addTodo, toggleTodo, deleteTodo } = usePatients();
  const { getBloodAlert } = useReminders();
  const [showBlood, setShowBlood] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [customTodo, setCustomTodo] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const bloodAlert = getBloodAlert(patient);
  const pendingTodos = patient.todos.filter((t) => !t.completed);
  const completedTodos = patient.todos.filter((t) => t.completed);
  const latestBlood = patient.bloodRecords[patient.bloodRecords.length - 1] || null;
  const daysSinceDressing = patient.lastDressingChange
    ? Math.floor((Date.now() - new Date(patient.lastDressingChange).getTime()) / 86400000)
    : null;
  const dressingOverdue = patient.dressingChangeFrequency && daysSinceDressing !== null
    && daysSinceDressing >= patient.dressingChangeFrequency;

  const handleQuickTodo = async (label: string, type: Todo["type"]) => {
    const exists = patient.todos.some((t) => t.content === label && !t.completed);
    if (exists) return;
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
    <div className="h-full flex flex-col px-4 py-3 overflow-y-auto scrollbar-hide">
      {/* ══ Patient header ══ */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 style={{ fontSize: "1.75rem", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)", lineHeight: 1.2 }}>
              {patient.bedNumber}
            </h1>
            <span
              className="px-2 py-0.5 rounded-full text-white font-medium"
              style={{
                backgroundColor: patient.group === "解组" ? "var(--info)" : "var(--success)",
                fontSize: "var(--font-size-small)",
              }}
            >
              {patient.group}
            </span>
          </div>
          <p style={{ fontSize: "var(--font-size-body)", color: "var(--muted-foreground)", marginTop: "2px" }}>
            {patient.name}
          </p>
        </div>
        <button
          onClick={() => setShowInfo(true)}
          className="p-2 rounded-lg ripple"
          style={{ backgroundColor: "var(--secondary)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--secondary-foreground)" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>

      {/* ══ Alerts ══ */}
      <div className="flex flex-col gap-1.5 mb-4">
        {bloodAlert && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              backgroundColor: bloodAlert.level === "danger" ? "var(--destructive)" : "var(--warning)",
              color: bloodAlert.level === "danger" ? "var(--destructive-foreground)" : "var(--warning-foreground)",
              fontSize: "var(--font-size-label)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
            </svg>
            查血已超 <strong>{bloodAlert.days}</strong> 天
          </div>
        )}
        {dressingOverdue && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              backgroundColor: "var(--warning)",
              color: "var(--warning-foreground)",
              fontSize: "var(--font-size-label)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2v20M2 12h20"/>
            </svg>
            换药已超 <strong>{daysSinceDressing}</strong> 天
          </div>
        )}
      </div>

      {/* ══ Latest blood record ══ */}
      {latestBlood && (
        <div
          className="rounded-lg p-3 mb-4"
          style={{ backgroundColor: "var(--muted)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)", fontWeight: "var(--font-weight-medium)" }}>
              最新查血 · {latestBlood.date}
            </span>
            <button
              onClick={() => setShowBlood(true)}
              className="text-xs px-2 py-1 rounded-full font-medium ripple"
              style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)", fontSize: "var(--font-size-small)" }}
            >
              录入
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {(["hb","wbc","plt","k","na","cr","alb","crp"] as const).map((key) => {
              const val = latestBlood[key];
              if (val === undefined) return null;
              const labels: Record<string,string> = { hb:"HB", wbc:"WBC", plt:"PLT", k:"K", na:"Na", cr:"Cr", alb:"Alb", crp:"CRP" };
              const critical = (
                (key === "hb" && val < 70) || (key === "wbc" && val > 12) ||
                (key === "plt" && (val < 50 || val > 450)) ||
                (key === "k" && (val < 3.0 || val > 5.5)) ||
                (key === "na" && (val < 130 || val > 150))
              );
              return (
                <div key={key} className="text-center py-1 rounded" style={{
                  backgroundColor: critical ? "var(--destructive)" : "transparent",
                  color: critical ? "var(--destructive-foreground)" : "var(--foreground)",
                }}>
                  <div style={{ fontSize: "10px", opacity: 0.6 }}>{labels[key]}</div>
                  <div style={{ fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-bold)" }}>{val}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ Quick todo chips ══ */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold" style={{ fontSize: "var(--font-size-label)", color: "var(--foreground)" }}>
            快捷待办
          </span>
          <button
            onClick={() => setShowBlood(true)}
            className="text-xs px-2.5 py-1 rounded-full font-medium ripple"
            style={{ backgroundColor: latestBlood ? "var(--secondary)" : "var(--primary)", color: latestBlood ? "var(--secondary-foreground)" : "var(--primary-foreground)", fontSize: "var(--font-size-small)" }}
          >
            {latestBlood ? "再次查血" : "录入查血"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_TODOS.map((item) => {
            const exists = patient.todos.some((t) => t.content === item.label && !t.completed);
            return (
              <button
                key={item.label}
                onClick={() => handleQuickTodo(item.label, item.type)}
                className="px-2.5 py-1.5 rounded-full font-medium transition-all active:scale-95 ripple"
                style={{
                  backgroundColor: exists ? "var(--success)" : "var(--secondary)",
                  color: exists ? "var(--success-foreground)" : "var(--secondary-foreground)",
                  fontSize: "var(--font-size-small)",
                  opacity: exists ? 0.6 : 1,
                }}
              >
                {exists ? "✓ " : "+ "}{item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ Custom todo input ══ */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="自定义待办..."
          value={customTodo}
          onChange={(e) => setCustomTodo(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCustomTodo(); }}
          className="flex-1 px-3 py-2.5 rounded-lg outline-none"
          style={{
            backgroundColor: "var(--muted)",
            border: `1.5px solid ${customTodo.trim() ? "var(--primary)" : "var(--border)"}`,
            fontSize: "var(--font-size-label)",
            color: "var(--foreground)",
          }}
        />
        <button
          onClick={handleCustomTodo}
          className="px-4 py-2.5 rounded-lg font-medium ripple active:scale-95 transition-transform"
          style={{
            backgroundColor: customTodo.trim() ? "var(--primary)" : "var(--secondary)",
            color: customTodo.trim() ? "var(--primary-foreground)" : "var(--secondary-foreground)",
            fontSize: "var(--font-size-label)",
          }}
        >
          添加
        </button>
      </div>

      {/* ══ Active todos ══ */}
      {pendingTodos.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2" style={{ fontSize: "var(--font-size-label)", color: "var(--foreground)" }}>
            待办 ({pendingTodos.length})
          </h3>
          <div className="space-y-1.5">
            <AnimatePresence>
              {pendingTodos.map((todo) => (
                <motion.div
                  key={todo.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg"
                  style={{ backgroundColor: "var(--muted)" }}
                >
                  <button
                    onClick={() => handleToggleTodo(todo.id)}
                    className="w-5 h-5 rounded-full border-2 flex-shrink-0 ripple"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <span className="flex-1" style={{ fontSize: "var(--font-size-label)", color: "var(--foreground)" }}>
                    {todo.content}
                  </span>
                  {todo.type && todo.type !== "其他" && (
                    <span
                      className="px-1.5 py-0.5 rounded text-xs"
                      style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)", fontSize: "var(--font-size-small)" }}
                    >
                      {todo.type}
                    </span>
                  )}
                  <button
                    onClick={() => deleteTodo(patient.id, todo.id)}
                    className="p-1 rounded ripple"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                    </svg>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ══ Completed todos ══ */}
      {completedTodos.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-1 w-full py-2 mb-1"
            style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              style={{ transform: showCompleted ? "rotate(180deg)" : "rotate(0deg)", transition: "transform var(--duration-fast)" }}
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
                className="space-y-1"
              >
                {completedTodos.map((todo) => (
                  <div key={todo.id} className="flex items-center gap-2.5 p-2 rounded-lg opacity-50" style={{ backgroundColor: "var(--muted)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span className="flex-1 line-through" style={{ fontSize: "var(--font-size-label)" }}>{todo.content}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ══ Bottom spacer for sheets ══ */}
      <div className="h-4 flex-shrink-0" />

      <BloodSheet patient={patient} open={showBlood} onOpenChange={setShowBlood} />
      <PatientInfoSheet patient={patient} open={showInfo} onOpenChange={setShowInfo} />
    </div>
  );
}
