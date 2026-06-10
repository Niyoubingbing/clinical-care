import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, Check, ChevronDown, Filter } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePatients } from "@/hooks/use-patients";
import { useMemos } from "@/hooks/use-memos";
import { getRoundingOrder } from "@/lib/rounding";
import { FadeIn } from "@/components/MotionPrimitives";
import type { Todo } from "@/types/patient";

type TodoFilter = "全部" | "换药" | "开术前" | "明天出院" | "康复会诊" | "会诊" | "复查" | "开查血" | "其他" | "通用";

export default function TodoSummary() {
  const navigate = useNavigate();
  const { patients } = useAppStore();
  const { toggleTodo, deleteTodo } = usePatients();
  const { addMemo, toggleMemo, deleteMemo } = useMemos();
  const memos = useAppStore((s) => s.memos);
  const [filter, setFilter] = useState<TodoFilter>("全部");
  const [showFilter, setShowFilter] = useState(false);
  const [customMemo, setCustomMemo] = useState("");

  const groupedTodos = useMemo(() => {
    const result: { patientId: string; bedNumber: string; name: string; todos: Todo[] }[] = [];

    for (const p of patients) {
      const pending = p.todos.filter((t) => !t.completed);
      const filtered = filter === "全部" || filter === "通用"
        ? pending
        : pending.filter((t) => (t.type || "其他") === filter);

      if (filtered.length > 0) {
        result.push({
          patientId: p.id,
          bedNumber: p.bedNumber,
          name: p.name,
          todos: filtered,
        });
      }
    }

    result.sort((a, b) => getRoundingOrder(a.bedNumber) - getRoundingOrder(b.bedNumber));
    return result;
  }, [patients, filter]);

  const filteredMemos = useMemo(() => {
    return memos.filter((m) => !m.completed);
  }, [memos]);

  const showMemos = filter === "全部" || filter === "通用";

  return (
    <div className="flex flex-col min-h-screen">
      <header
        className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
        style={{
          backgroundColor: "var(--background)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2">
          <ClipboardList size={22} style={{ color: "var(--primary)" }} />
          <h1 style={{ fontSize: "var(--font-size-title)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>
            待办汇总
          </h1>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="p-2 rounded-md"
            style={{
              backgroundColor: "var(--secondary)",
              color: "var(--secondary-foreground)",
              minWidth: "44px",
              minHeight: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Filter size={18} />
          </button>
          <AnimatePresence>
            {showFilter && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 top-full mt-1 rounded-md shadow-md z-50 overflow-hidden"
                style={{
                  backgroundColor: "var(--popover)",
                  border: "1px solid var(--border)",
                  minWidth: "120px",
                  maxHeight: "300px",
                  overflowY: "auto",
                }}
              >
                {(["全部", "换药", "开术前", "明天出院", "康复会诊", "会诊", "复查", "开查血", "其他", "通用"] as TodoFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => { setFilter(f); setShowFilter(false); }}
                    className="block w-full text-left px-4 py-2.5"
                    style={{
                      fontSize: "var(--font-size-label)",
                      backgroundColor: filter === f ? "var(--accent)" : "transparent",
                      color: "var(--foreground)",
                      minHeight: "44px",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="flex-1 px-4 py-3 space-y-4">
        {/* Memos Section */}
        {showMemos && (
          <FadeIn>
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
            >
              <h3 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", marginBottom: "var(--spacing-sm)" }}>
                通用备忘录
              </h3>
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
                  className="flex-1 px-3 py-2 rounded-md outline-none"
                  style={{
                    backgroundColor: "var(--muted)",
                    border: "1px solid var(--border)",
                    fontSize: "var(--font-size-label)",
                    color: "var(--foreground)",
                  }}
                />
                <button
                  onClick={async () => {
                    if (customMemo.trim()) {
                      await addMemo(customMemo.trim());
                      setCustomMemo("");
                    }
                  }}
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
              {filteredMemos.length === 0 ? (
                <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", textAlign: "center", padding: "var(--spacing-sm) 0" }}>
                  暂无备忘录
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredMemos.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 p-2 rounded-md" style={{ backgroundColor: "var(--muted)" }}>
                      <button
                        onClick={() => toggleMemo(m.id)}
                        className="w-6 h-6 rounded border-2 flex-shrink-0 flex items-center justify-center"
                        style={{ borderColor: "var(--border)", minWidth: "44px", minHeight: "44px" }}
                      >
                        <Check size={14} style={{ color: "var(--muted-foreground)" }} />
                      </button>
                      <span className="flex-1" style={{ fontSize: "var(--font-size-label)", color: "var(--foreground)" }}>
                        {m.content}
                      </span>
                      <button
                        onClick={() => deleteMemo(m.id)}
                        className="p-1"
                        style={{ minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FadeIn>
        )}

        {/* Patient Todos */}
        {groupedTodos.length === 0 && filter !== "通用" ? (
          <FadeIn>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList size={48} style={{ color: "var(--muted-foreground)", marginBottom: "var(--spacing-md)" }} />
              <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}>
                暂无待办事项
              </p>
            </div>
          </FadeIn>
        ) : (
          groupedTodos.map((group, gi) => (
            <FadeIn key={group.patientId}>
              <div
                className="rounded-lg p-4"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
              >
                <button
                  onClick={() => navigate(`/patient/${group.patientId}`)}
                  className="flex items-center gap-2 mb-3"
                >
                  <span style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                    {group.bedNumber}
                  </span>
                  <span style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}>
                    {group.name}
                  </span>
                </button>
                <div className="space-y-2">
                  {group.todos.map((todo) => (
                    <div key={todo.id} className="flex items-center gap-3 p-2 rounded-md" style={{ backgroundColor: "var(--muted)" }}>
                      <button
                        onClick={() => toggleTodo(group.patientId, todo.id)}
                        className="w-6 h-6 rounded border-2 flex-shrink-0 flex items-center justify-center"
                        style={{ borderColor: "var(--border)", minWidth: "44px", minHeight: "44px" }}
                      >
                        <Check size={14} style={{ color: "var(--muted-foreground)" }} />
                      </button>
                      <span className="flex-1" style={{ fontSize: "var(--font-size-label)", color: "var(--foreground)" }}>
                        {todo.content}
                      </span>
                      {todo.type && (
                        <span
                          className="px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: "var(--secondary)",
                            color: "var(--secondary-foreground)",
                            fontSize: "var(--font-size-small)",
                          }}
                        >
                          {todo.type}
                        </span>
                      )}
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
