import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trash2, Plus, Check, ChevronDown, Edit3, Droplet, Calendar, Bandage } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePatients } from "@/hooks/use-patients";
import { useReminders } from "@/hooks/use-reminders";
import { FadeIn } from "@/components/MotionPrimitives";
import { toast } from "sonner";
import type { Todo } from "@/types/patient";
import BloodRecordDialog from "@/components/BloodRecordDialog";
import EditPatientDialog from "@/components/EditPatientDialog";

const QUICK_TODO_LABELS: { label: string; type: Todo["type"]; icon: typeof Check }[] = [
  { label: "换药", type: "换药", icon: Bandage },
  { label: "开术前", type: "开术前", icon: Edit3 },
  { label: "明天出院", type: "明天出院", icon: Check },
  { label: "康复会诊", type: "康复会诊", icon: Calendar },
  { label: "会诊", type: "会诊", icon: Calendar },
  { label: "复查", type: "复查", icon: Check },
];

function isCriticalValue(key: string, value: number): boolean {
  if (key === "hb" && value < 70) return true;
  if (key === "wbc" && value > 12) return true;
  if (key === "plt" && (value < 50 || value > 450)) return true;
  if (key === "k" && (value < 3.0 || value > 5.5)) return true;
  if (key === "na" && (value < 130 || value > 150)) return true;
  return false;
}

const BLOOD_KEYS = [
  { key: "hb" as const, label: "HB", unit: "g/L" },
  { key: "wbc" as const, label: "WBC", unit: "×10⁹/L" },
  { key: "plt" as const, label: "PLT", unit: "×10⁹/L" },
  { key: "k" as const, label: "K", unit: "mmol/L" },
  { key: "na" as const, label: "Na", unit: "mmol/L" },
  { key: "cr" as const, label: "Cr", unit: "μmol/L" },
  { key: "alb" as const, label: "Alb", unit: "g/L" },
  { key: "crp" as const, label: "CRP", unit: "mg/L" },
];

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const patients = useAppStore((s) => s.patients);
  const { updatePatient, deletePatient, addBloodRecord, addTodo, toggleTodo, deleteTodo } = usePatients();
  const { getBloodAlert } = useReminders();
  const [showBlood, setShowBlood] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [customTodo, setCustomTodo] = useState("");

  const patient = useMemo(() => patients.find((p) => p.id === id), [patients, id]);

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p style={{ color: "var(--muted-foreground)" }}>病人不存在</p>
        <button onClick={() => navigate("/")} style={{ color: "var(--primary)" }}>返回列表</button>
      </div>
    );
  }

  const bloodAlert = getBloodAlert(patient);
  const pendingTodos = patient.todos.filter((t) => !t.completed);
  const completedTodos = patient.todos.filter((t) => t.completed);
  const latestBlood = patient.bloodRecords.length > 0 ? patient.bloodRecords[patient.bloodRecords.length - 1] : null;

  const handleDelete = async () => {
    await deletePatient(patient.id);
    toast.success("已删除病人");
    navigate("/");
  };

  const handleQuickTodo = async (label: string, type: Todo["type"]) => {
    const exists = patient.todos.some((t) => t.content === label && !t.completed);
    if (exists) {
      toast.info("该待办已存在");
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
    }
  };

  const hasInfo = patient.surgeryDate || patient.dressingChangeFrequency || patient.lastDressingChange || patient.lastBloodCheck;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header
        className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3"
        style={{
          backgroundColor: "var(--background)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{
            minWidth: "44px",
            minHeight: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={20} style={{ color: "var(--foreground)" }} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "var(--font-size-title)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>
              {patient.bedNumber}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-white"
              style={{
                backgroundColor: patient.group === "解组" ? "var(--theme-blue)" : "var(--theme-green)",
                fontSize: "var(--font-size-small)",
              }}
            >
              {patient.group}
            </span>
          </div>
          <p className="truncate" style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}>
            {patient.name}
          </p>
        </div>
        <button onClick={() => setShowEdit(true)}
          style={{ minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Edit3 size={18} style={{ color: "var(--muted-foreground)" }} />
        </button>
        <button onClick={() => setShowDelete(true)}
          style={{ minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Trash2 size={18} style={{ color: "var(--destructive)" }} />
        </button>
      </header>

      <main className="flex-1 px-4 py-3 space-y-3">
        {/* Blood Alert */}
        {bloodAlert && (
          <FadeIn>
            <div
              className="rounded-lg p-3 flex items-center gap-3"
              style={{
                backgroundColor: bloodAlert.level === "danger" ? "var(--destructive)" : "var(--warning)",
                color: bloodAlert.level === "danger" ? "white" : "var(--warning-foreground)",
              }}
            >
              <Droplet size={20} />
              <div style={{ fontSize: "var(--font-size-label)" }}>
                查血已超 <strong>{bloodAlert.days}</strong> 天，建议尽快查血
              </div>
            </div>
          </FadeIn>
        )}

        {/* Quick Todo - moved to top as highest frequency */}
        <FadeIn>
          <div className="rounded-lg p-3"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-2">
              <h3 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                快捷待办
              </h3>
              <span style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}>
                {pendingTodos.length} 项未完成
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TODO_LABELS.map((item) => {
                const exists = patient.todos.some(
                  (t) => t.content === item.label && !t.completed
                );
                return (
                  <button
                    key={item.label}
                    onClick={() => handleQuickTodo(item.label, item.type)}
                    className="px-2.5 py-1.5 rounded-full transition-colors"
                    style={{
                      backgroundColor: exists ? "var(--success)" : "var(--secondary)",
                      color: exists ? "var(--success-foreground)" : "var(--secondary-foreground)",
                      fontSize: "var(--font-size-small)",
                      minHeight: "36px",
                      opacity: exists ? 0.6 : 1,
                    }}
                  >
                    {exists ? <Check size={12} className="inline mr-1" /> : <Plus size={12} className="inline mr-1" />}
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 mt-2">
              <input
                type="text"
                placeholder="自定义待办..."
                value={customTodo}
                onChange={(e) => setCustomTodo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustomTodo()}
                className="flex-1 px-2.5 py-2 rounded-lg outline-none"
                style={{
                  backgroundColor: "var(--muted)",
                  border: "1px solid var(--border)",
                  fontSize: "var(--font-size-label)",
                  color: "var(--foreground)",
                }}
              />
              <button
                onClick={handleCustomTodo}
                className="px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                  fontSize: "var(--font-size-label)",
                  minHeight: "44px",
                }}
              >
                添加
              </button>
            </div>
          </div>
        </FadeIn>

        {/* Blood Record */}
        <FadeIn>
          <div className="rounded-lg p-3"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                查血记录
              </h3>
              <div className="flex items-center gap-2">
                {patient.bloodRecords.length > 0 && (
                  <span style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}>
                    {patient.bloodRecords.length} 次
                  </span>
                )}
                <button
                  onClick={() => setShowBlood(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                    fontSize: "var(--font-size-label)",
                    minHeight: "36px",
                  }}
                >
                  <Plus size={14} />
                  录入
                </button>
              </div>
            </div>

            {latestBlood ? (
              <div>
                {/* 2-column table layout */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {BLOOD_KEYS.map(({ key, label, unit }) => {
                    const val = latestBlood[key] as number | undefined;
                    if (val === undefined) return null;
                    const critical = isCriticalValue(key, val);
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between py-1 px-2 rounded"
                        style={{
                          backgroundColor: critical ? "var(--destructive)" : "var(--muted)",
                          color: critical ? "white" : "var(--foreground)",
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span style={{ fontSize: "var(--font-size-small)", opacity: 0.8, fontWeight: "var(--font-weight-medium)" }}>
                            {label}
                          </span>
                          <span style={{ fontSize: "10px", opacity: 0.5 }}>{unit}</span>
                        </div>
                        <span
                          style={{
                            fontSize: "var(--font-size-label)",
                            fontWeight: "var(--font-weight-bold)",
                          }}
                        >
                          {val}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-center" style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}>
                  {latestBlood.date}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", textAlign: "center", padding: "var(--spacing-lg) 0" }}>
                暂无查血记录，点击"录入"添加
              </p>
            )}
          </div>
        </FadeIn>

        {/* Todo list */}
        <FadeIn>
          <div className="rounded-lg p-3"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", marginBottom: "var(--spacing-sm)" }}>
              待办列表
            </h3>
            {pendingTodos.length === 0 ? (
              <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", textAlign: "center", padding: "var(--spacing-sm) 0" }}>
                全部完成
              </p>
            ) : (
              <div className="space-y-1.5">
                <AnimatePresence>
                  {pendingTodos.map((todo) => (
                    <motion.div
                      key={todo.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2.5 p-2 rounded-lg"
                      style={{ backgroundColor: "var(--muted)" }}
                    >
                      <button
                        onClick={() => handleToggleTodo(todo.id)}
                        className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: "var(--border)" }}
                      />
                      <span className="flex-1" style={{ fontSize: "var(--font-size-label)", color: "var(--foreground)" }}>
                        {todo.content}
                      </span>
                      <div className="flex items-center gap-1">
                        {todo.type && todo.type !== "其他" && (
                          <span className="px-1.5 py-0.5 rounded text-xs"
                            style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)", fontSize: "var(--font-size-small)" }}>
                            {todo.type}
                          </span>
                        )}
                        <button onClick={() => deleteTodo(patient.id, todo.id)}
                          style={{ padding: "4px", display: "flex" }}>
                          <Trash2 size={12} style={{ color: "var(--muted-foreground)" }} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {completedTodos.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center gap-1 w-full py-2"
                  style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", minHeight: "44px" }}
                >
                  <ChevronDown
                    size={16}
                    style={{
                      transform: showCompleted ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform var(--duration-fast) var(--ease-default)",
                    }}
                  />
                  已完成的 ({completedTodos.length})
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
                        <div key={todo.id} className="flex items-center gap-2.5 p-2 rounded-lg opacity-50"
                          style={{ backgroundColor: "var(--muted)" }}>
                          <Check size={14} style={{ color: "var(--success)" }} />
                          <span className="flex-1 line-through" style={{ fontSize: "var(--font-size-label)" }}>
                            {todo.content}
                          </span>
                          {todo.completedAt && (
                            <span style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}>
                              {todo.completedAt.slice(5, 10)}
                            </span>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </FadeIn>

        {/* Patient Info - collapsed by default if no info */}
        {hasInfo && (
          <FadeIn>
            <div className="rounded-lg p-3"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", marginBottom: "var(--spacing-sm)" }}>
                基本信息
              </h3>
              <div className="space-y-1.5" style={{ fontSize: "var(--font-size-label)" }}>
                {patient.surgeryDate && (
                  <div className="flex justify-between">
                    <span style={{ color: "var(--muted-foreground)" }}>手术日期</span>
                    <span style={{ color: "var(--foreground)", fontWeight: "var(--font-weight-medium)" }}>{patient.surgeryDate}</span>
                  </div>
                )}
                {patient.dressingChangeFrequency && (
                  <div className="flex justify-between">
                    <span style={{ color: "var(--muted-foreground)" }}>换药频率</span>
                    <span style={{ color: "var(--foreground)", fontWeight: "var(--font-weight-medium)" }}>每 {patient.dressingChangeFrequency} 天</span>
                  </div>
                )}
                {patient.lastDressingChange && (
                  <div className="flex justify-between">
                    <span style={{ color: "var(--muted-foreground)" }}>上次换药</span>
                    <span style={{ color: "var(--foreground)", fontWeight: "var(--font-weight-medium)" }}>{patient.lastDressingChange}</span>
                  </div>
                )}
                {patient.lastBloodCheck && (
                  <div className="flex justify-between">
                    <span style={{ color: "var(--muted-foreground)" }}>上次查血</span>
                    <span style={{ color: "var(--foreground)", fontWeight: "var(--font-weight-medium)" }}>{patient.lastBloodCheck}</span>
                  </div>
                )}
              </div>
            </div>
          </FadeIn>
        )}
      </main>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {showDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            onClick={() => setShowDelete(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-[85vw] max-w-sm rounded-xl p-4"
              style={{ backgroundColor: "var(--background)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", marginBottom: "var(--spacing-sm)" }}>
                确认删除
              </h3>
              <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", marginBottom: "var(--spacing-md)" }}>
                确定要删除 {patient.bedNumber} {patient.name} 的所有数据吗？此操作不可撤销。
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDelete(false)}
                  className="flex-1 py-3 rounded-lg"
                  style={{
                    backgroundColor: "var(--secondary)",
                    color: "var(--secondary-foreground)",
                    fontSize: "var(--font-size-label)",
                    minHeight: "48px",
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-lg"
                  style={{
                    backgroundColor: "var(--destructive)",
                    color: "white",
                    fontSize: "var(--font-size-label)",
                    minHeight: "48px",
                  }}
                >
                  删除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BloodRecordDialog open={showBlood} onOpenChange={setShowBlood} onSave={(record) => addBloodRecord(patient.id, record)} />
      <EditPatientDialog open={showEdit} onOpenChange={setShowEdit} patient={patient}
        onSave={(updates) => updatePatient(patient.id, updates)} />
    </div>
  );
}
