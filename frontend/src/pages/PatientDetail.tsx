import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trash2, Plus, Check, ChevronDown, Edit3, Droplet, Calendar } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePatients } from "@/hooks/use-patients";
import { useReminders } from "@/hooks/use-reminders";
import { FadeIn } from "@/components/MotionPrimitives";
import { toast } from "sonner";
import type { BloodRecord, Todo } from "@/types/patient";
import BloodRecordDialog from "@/components/BloodRecordDialog";
import EditPatientDialog from "@/components/EditPatientDialog";

const QUICK_TODO_LABELS: { label: string; type: Todo["type"] }[] = [
  { label: "换药", type: "换药" },
  { label: "开术前", type: "开术前" },
  { label: "明天出院", type: "明天出院" },
  { label: "康复会诊", type: "康复会诊" },
  { label: "会诊", type: "会诊" },
  { label: "复查", type: "复查" },
];

function isCriticalValue(key: string, value: number): boolean {
  if (key === "hb" && value < 70) return true;
  if (key === "wbc" && value > 12) return true;
  if (key === "plt" && (value < 50 || value > 450)) return true;
  if (key === "k" && (value < 3.0 || value > 5.5)) return true;
  if (key === "na" && (value < 130 || value > 150)) return true;
  return false;
}

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const patients = useAppStore((s) => s.patients);
  const { updatePatient, deletePatient, addBloodRecord, deleteBloodRecord, addTodo, toggleTodo, deleteTodo } = usePatients();
  const { getBloodAlert } = useReminders();
  const [showBlood, setShowBlood] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
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
    // If dressing change todo was completed, update lastDressingChange
    if (todo && (todo.type === "换药" || todo.content === "换药") && !todo.completed) {
      const today = new Date().toISOString().slice(0, 10);
      await updatePatient(patient.id, { lastDressingChange: today });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header
        className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3"
        style={{
          backgroundColor: "var(--background)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-md"
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
        <div className="flex-1">
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
          <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}>
            {patient.name}
          </p>
        </div>
        <button
          onClick={() => setShowEdit(true)}
          className="p-2 rounded-md"
          style={{
            minWidth: "44px",
            minHeight: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Edit3 size={18} style={{ color: "var(--muted-foreground)" }} />
        </button>
        <button
          onClick={handleDelete}
          className="p-2 rounded-md"
          style={{
            minWidth: "44px",
            minHeight: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Trash2 size={18} style={{ color: "var(--destructive)" }} />
        </button>
      </header>

      <main className="flex-1 px-4 py-3 space-y-4">
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
              <span style={{ fontSize: "var(--font-size-body)" }}>
                查血已超{bloodAlert.days}天，建议尽快查血
              </span>
            </div>
          </FadeIn>
        )}

        {/* Blood Record */}
        <FadeIn>
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                查血记录
              </h3>
              <button
                onClick={() => setShowBlood(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                  fontSize: "var(--font-size-label)",
                  minHeight: "44px",
                }}
              >
                <Plus size={16} />
                录入
              </button>
            </div>

            {latestBlood ? (
              <div className="grid grid-cols-4 gap-2">
                {(["hb", "wbc", "plt", "k", "na", "cr", "alb", "crp"] as const).map((key) => {
                  const val = latestBlood[key as keyof BloodRecord];
                  if (val === undefined) return null;
                  const critical = isCriticalValue(key, val);
                  return (
                    <div key={key} className="text-center p-2 rounded" style={{ backgroundColor: critical ? "var(--destructive)" : "var(--muted)", color: critical ? "white" : "var(--foreground)" }}>
                      <div style={{ fontSize: "var(--font-size-small)", opacity: 0.7 }}>{key.toUpperCase()}</div>
                      <div style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)" }}>{val}</div>
                    </div>
                  );
                })}
                <div className="col-span-4 text-center" style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}>
                  {latestBlood.date}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", textAlign: "center", padding: "var(--spacing-md) 0" }}>
                暂无查血记录
              </p>
            )}
          </div>
        </FadeIn>

        {/* Patient Info */}
        <FadeIn>
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <h3 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", marginBottom: "var(--spacing-sm)" }}>
              基本信息
            </h3>
            <div className="grid grid-cols-2 gap-2" style={{ fontSize: "var(--font-size-label)" }}>
              {patient.surgeryDate && (
                <div>
                  <span style={{ color: "var(--muted-foreground)" }}>手术日期：</span>
                  <span style={{ color: "var(--foreground)" }}>{patient.surgeryDate}</span>
                </div>
              )}
              {patient.dressingChangeFrequency && (
                <div>
                  <span style={{ color: "var(--muted-foreground)" }}>换药频率：</span>
                  <span style={{ color: "var(--foreground)" }}>{patient.dressingChangeFrequency}天</span>
                </div>
              )}
              {patient.lastDressingChange && (
                <div>
                  <span style={{ color: "var(--muted-foreground)" }}>上次换药：</span>
                  <span style={{ color: "var(--foreground)" }}>{patient.lastDressingChange}</span>
                </div>
              )}
              {patient.lastBloodCheck && (
                <div>
                  <span style={{ color: "var(--muted-foreground)" }}>上次查血：</span>
                  <span style={{ color: "var(--foreground)" }}>{patient.lastBloodCheck}</span>
                </div>
              )}
            </div>
          </div>
        </FadeIn>

        {/* Quick Todo */}
        <FadeIn>
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <h3 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", marginBottom: "var(--spacing-sm)" }}>
              快捷待办
            </h3>
            <div className="flex flex-wrap gap-2">
              {QUICK_TODO_LABELS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleQuickTodo(item.label, item.type)}
                  className="px-3 py-1.5 rounded-full"
                  style={{
                    backgroundColor: "var(--secondary)",
                    color: "var(--secondary-foreground)",
                    fontSize: "var(--font-size-label)",
                    minHeight: "44px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Plus size={14} className="mr-1" />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mt-3">
              <input
                type="text"
                placeholder="自定义待办..."
                value={customTodo}
                onChange={(e) => setCustomTodo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustomTodo()}
                className="flex-1 px-3 py-2 rounded-md outline-none"
                style={{
                  backgroundColor: "var(--muted)",
                  border: "1px solid var(--border)",
                  fontSize: "var(--font-size-label)",
                  color: "var(--foreground)",
                }}
              />
              <button
                onClick={handleCustomTodo}
                className="px-3 py-2 rounded-md"
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

        {/* Todos */}
        <FadeIn>
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <h3 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", marginBottom: "var(--spacing-sm)" }}>
              待办事项 ({pendingTodos.length})
            </h3>
            {pendingTodos.length === 0 ? (
              <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", textAlign: "center", padding: "var(--spacing-sm) 0" }}>
                暂无待办
              </p>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {pendingTodos.map((todo) => (
                    <motion.div
                      key={todo.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-3 p-2 rounded-md"
                      style={{ backgroundColor: "var(--muted)" }}
                    >
                      <button
                        onClick={() => handleToggleTodo(todo.id)}
                        className="w-6 h-6 rounded border-2 flex-shrink-0 flex items-center justify-center"
                        style={{ borderColor: "var(--border)", minWidth: "44px", minHeight: "44px" }}
                      >
                        <Check size={14} style={{ color: "var(--muted-foreground)" }} />
                      </button>
                      <span className="flex-1" style={{ fontSize: "var(--font-size-label)", color: "var(--foreground)" }}>
                        {todo.content}
                      </span>
                      <button
                        onClick={() => deleteTodo(patient.id, todo.id)}
                        className="p-1"
                        style={{ minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Trash2 size={14} style={{ color: "var(--muted-foreground)" }} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Completed Todos */}
            {completedTodos.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center gap-1 w-full py-2"
                  style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", minHeight: "44px" }}
                >
                  <ChevronDown
                    size={16}
                    style={{ transform: showCompleted ? "rotate(180deg)" : "rotate(0deg)", transition: "transform var(--duration-fast) var(--ease-default)" }}
                  />
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
                        <div
                          key={todo.id}
                          className="flex items-center gap-3 p-2 rounded-md opacity-60"
                          style={{ backgroundColor: "var(--muted)" }}
                        >
                          <Check size={14} style={{ color: "var(--success)" }} />
                          <span className="flex-1 line-through" style={{ fontSize: "var(--font-size-label)" }}>
                            {todo.content}
                          </span>
                          {todo.completedAt && (
                            <span style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}>
                              {todo.completedAt.slice(0, 10)}
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
      </main>

      <BloodRecordDialog
        open={showBlood}
        onOpenChange={setShowBlood}
        onSave={(record) => addBloodRecord(patient.id, record)}
      />
      <EditPatientDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        patient={patient}
        onSave={(updates) => updatePatient(patient.id, updates)}
      />
    </div>
  );
}
