import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, Check, Trash2, StickyNote } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePatients } from "@/hooks/use-patients";
import { useMemos } from "@/hooks/use-memos";
import { getRoundingOrder } from "@/lib/rounding";
import { FadeIn } from "@/components/MotionPrimitives";
import type { Todo } from "@/types/patient";

type TabType = "all" | "memo";
type TodoFilter = "全部" | "换药" | "开术前" | "明天出院" | "会诊" | "复查" | "开查血" | "其他";

const FILTER_CHIPS: TodoFilter[] = ["全部", "换药", "开术前", "明天出院", "会诊", "复查", "开查血", "其他"];

export default function TodoSummary() {
  const navigate = useNavigate();
  const { patients } = useAppStore();
  const { toggleTodo, deleteTodo } = usePatients();
  const { addMemo, toggleMemo, deleteMemo } = useMemos();
  const memos = useAppStore((s) => s.memos);
  const [filter, setFilter] = useState<TodoFilter>("全部");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [customMemo, setCustomMemo] = useState("");

  const groupedTodos = useMemo(() => {
    if (activeTab === "memo") return [];
    const result: { patientId: string; bedNumber: string; name: string; todos: Todo[] }[] = [];

    for (const p of patients) {
      const pending = p.todos.filter((t) => !t.completed);
      const filtered = filter === "全部"
        ? pending
        : pending.filter((t) => (t.type || "其他") === filter);

      if (filtered.length > 0) {
        result.push({ patientId: p.id, bedNumber: p.bedNumber, name: p.name, todos: filtered });
      }
    }

    result.sort((a, b) => getRoundingOrder(a.bedNumber) - getRoundingOrder(b.bedNumber));
    return result;
  }, [patients, filter, activeTab]);

  const filteredMemos = useMemo(() => memos.filter((m) => !m.completed), [memos]);

  const totalPending = useMemo(
    () => patients.reduce((sum, p) => sum + p.todos.filter((t) => !t.completed).length, 0),
    [patients]
  );

  return (
    <div className="flex flex-col min-h-screen">
      <header
        className="sticky top-0 z-40"
        style={{ backgroundColor: "var(--background)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={22} style={{ color: "var(--primary)" }} />
            <h1 style={{ fontSize: "var(--font-size-title)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>
              待办汇总
            </h1>
          </div>
          {totalPending > 0 && (
            <span className="px-2.5 py-1 rounded-full" style={{ backgroundColor: "var(--warning)", color: "var(--warning-foreground)", fontSize: "var(--font-size-small)", fontWeight: "var(--font-weight-semibold)" }}>
              {totalPending} 项
            </span>
          )}
        </div>

        {/* Tab bar */}
        <div className="px-4 pb-2 flex border-b" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setActiveTab("all")}
            className="flex-1 py-2 text-center relative"
            style={{
              color: activeTab === "all" ? "var(--primary)" : "var(--muted-foreground)",
              fontSize: "var(--font-size-label)",
              fontWeight: "var(--font-weight-medium)",
              minHeight: "44px",
            }}
          >
            病人待办
            {activeTab === "all" && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                style={{ backgroundColor: "var(--primary)" }}
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("memo")}
            className="flex-1 py-2 text-center relative"
            style={{
              color: activeTab === "memo" ? "var(--primary)" : "var(--muted-foreground)",
              fontSize: "var(--font-size-label)",
              fontWeight: "var(--font-weight-medium)",
              minHeight: "44px",
            }}
          >
            备忘录
            {activeTab === "memo" && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                style={{ backgroundColor: "var(--primary)" }}
              />
            )}
          </button>
        </div>

        {/* Filter chips (only for patient todos) */}
        {activeTab === "all" && (
          <div className="px-4 py-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
            {FILTER_CHIPS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0"
                style={{
                  backgroundColor: filter === f ? "var(--primary)" : "var(--secondary)",
                  color: filter === f ? "var(--primary-foreground)" : "var(--secondary-foreground)",
                  fontSize: "var(--font-size-small)",
                  minHeight: "30px",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 px-4 py-3 space-y-3">
        {/* Memo Tab */}
        {activeTab === "memo" && (
          <FadeIn>
            <div className="rounded-lg p-3" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="添加备忘录..."
                  value={customMemo}
                  onChange={(e) => setCustomMemo(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && customMemo.trim()) {
                      await addMemo(customMemo.trim());
                      setCustomMemo("");
                    }
                  }}
                  className="flex-1 px-2.5 py-2 rounded-lg outline-none"
                  style={{
                    backgroundColor: "var(--muted)",
                    border: "1px solid var(--border)",
                    fontSize: "var(--font-size-label)",
                    color: "var(--foreground)",
                  }}
                />
                <button
                  onClick={async () => {
                    if (customMemo.trim()) { await addMemo(customMemo.trim()); setCustomMemo(""); }
                  }}
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
              {filteredMemos.length === 0 ? (
                <div className="text-center py-6" style={{ color: "var(--muted-foreground)" }}>
                  <StickyNote size={32} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
                  <p style={{ fontSize: "var(--font-size-label)" }}>暂无备忘录</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredMemos.map((m) => (
                    <div key={m.id} className="flex items-center gap-2.5 p-2 rounded-lg group" style={{ backgroundColor: "var(--muted)" }}>
                      <button
                        onClick={() => toggleMemo(m.id)}
                        className="w-5 h-5 rounded-full border-2 flex-shrink-0"
                        style={{ borderColor: "var(--border)" }}
                      />
                      <span className="flex-1" style={{ fontSize: "var(--font-size-label)", color: "var(--foreground)" }}>
                        {m.content}
                      </span>
                      <button onClick={() => deleteMemo(m.id)} className="opacity-0 group-hover:opacity-100 p-1">
                        <Trash2 size={12} style={{ color: "var(--muted-foreground)" }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FadeIn>
        )}

        {/* Patient Todos Tab */}
        {activeTab === "all" && groupedTodos.length === 0 ? (
          <FadeIn>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardList size={48} style={{ color: "var(--muted-foreground)", marginBottom: "var(--spacing-md)" }} />
              <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}>
                {totalPending === 0 ? "所有待办已完成" : "该筛选下没有待办"}
              </p>
            </div>
          </FadeIn>
        ) : (
          activeTab === "all" && groupedTodos.map((group) => (
            <FadeIn key={group.patientId}>
              <div className="rounded-lg p-3" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
                <button
                  onClick={() => navigate(`/patient/${group.patientId}`)}
                  className="flex items-center gap-2 mb-2"
                >
                  <span style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                    {group.bedNumber}
                  </span>
                  <span style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}>
                    {group.name}
                  </span>
                </button>
                <div className="space-y-1">
                  {group.todos.map((todo) => (
                    <div key={todo.id} className="flex items-center gap-2.5 p-2 rounded-lg group" style={{ backgroundColor: "var(--muted)" }}>
                      <button
                        onClick={() => toggleTodo(group.patientId, todo.id)}
                        className="w-5 h-5 rounded-full border-2 flex-shrink-0"
                        style={{ borderColor: "var(--border)" }}
                      />
                      <span className="flex-1" style={{ fontSize: "var(--font-size-label)", color: "var(--foreground)" }}>
                        {todo.content}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {todo.type && todo.type !== "其他" && (
                          <span className="px-1.5 py-0.5 rounded text-xs"
                            style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)", fontSize: "var(--font-size-small)" }}>
                            {todo.type}
                          </span>
                        )}
                        <button onClick={() => deleteTodo(group.patientId, todo.id)} className="p-1">
                          <Trash2 size={12} style={{ color: "var(--muted-foreground)" }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          ))
        )}
      </main>
    </div>
  );
}
