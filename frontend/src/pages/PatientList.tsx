import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Stethoscope, Upload, ListFilter } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePatients } from "@/hooks/use-patients";
import { useReminders } from "@/hooks/use-reminders";
import { getRoundingOrder } from "@/lib/rounding";
import { FadeIn } from "@/components/MotionPrimitives";
import AddPatientDialog from "@/components/AddPatientDialog";
import ImportTextDialog from "@/components/ImportTextDialog";

export default function PatientList() {
  const navigate = useNavigate();
  const { patients, searchQuery, groupFilter, sortMode, setSearchQuery, setGroupFilter, setSortMode } = useAppStore();
  const { addPatient } = usePatients();
  const { getBloodAlert } = useReminders();
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const filtered = useMemo(() => {
    let list = [...patients];
    if (groupFilter !== "全部") {
      list = list.filter((p) => p.group === groupFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) => p.bedNumber.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
      );
    }
    if (sortMode === "rounding") {
      list.sort((a, b) => getRoundingOrder(a.bedNumber) - getRoundingOrder(b.bedNumber));
    } else {
      list.sort((a, b) => a.bedNumber.localeCompare(b.bedNumber));
    }
    return list;
  }, [patients, searchQuery, groupFilter, sortMode]);

  const stats = useMemo(() => {
    const pendingTodos = patients.reduce((sum, p) => sum + p.todos.filter((t) => !t.completed).length, 0);
    const dangerCount = patients.filter((p) => {
      const alert = getBloodAlert(p);
      return alert?.level === "danger";
    }).length;
    return { total: patients.length, pendingTodos, dangerCount };
  }, [patients]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header
        className="sticky top-0 z-40"
        style={{
          backgroundColor: "var(--background)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope size={22} style={{ color: "var(--primary)" }} />
              <h1 style={{ fontSize: "var(--font-size-title)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>
                查房列表
              </h1>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="p-2 rounded-lg"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
                minWidth: "44px",
                minHeight: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Stats bar */}
          {patients.length > 0 && (
            <div className="flex items-center gap-3 mt-2" style={{ fontSize: "var(--font-size-small)" }}>
              <span style={{ color: "var(--muted-foreground)" }}>
                共 <strong style={{ color: "var(--foreground)" }}>{stats.total}</strong> 人
              </span>
              {stats.pendingTodos > 0 && (
                <span style={{ color: "var(--warning)", fontWeight: "var(--font-weight-medium)" }}>
                  {stats.pendingTodos} 项待办
                </span>
              )}
              {stats.dangerCount > 0 && (
                <span style={{ color: "var(--destructive)", fontWeight: "var(--font-weight-medium)" }}>
                  {stats.dangerCount} 人查血超期
                </span>
              )}
            </div>
          )}
        </div>

        {/* Search + Filter chips */}
        <div className="px-4 pb-3 space-y-2">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              backgroundColor: "var(--muted)",
              border: "1px solid var(--border)",
            }}
          >
            <Search size={16} style={{ color: "var(--muted-foreground)" }} />
            <input
              type="text"
              placeholder="搜索床号或姓名"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none"
              style={{ fontSize: "var(--font-size-label)", color: "var(--foreground)" }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{ color: "var(--muted-foreground)", padding: "2px" }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 flex-1 overflow-x-auto scrollbar-hide">
              {(["全部", "解组", "勇组"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupFilter(g)}
                  className="px-3 py-1.5 rounded-full whitespace-nowrap transition-colors"
                  style={{
                    backgroundColor: groupFilter === g
                      ? (g === "解组" ? "var(--theme-blue)" : g === "勇组" ? "var(--theme-green)" : "var(--primary)")
                      : "var(--secondary)",
                    color: groupFilter === g ? "white" : "var(--secondary-foreground)",
                    fontSize: "var(--font-size-small)",
                    fontWeight: "var(--font-weight-medium)",
                    minHeight: "32px",
                  }}
                >
                  {g}
                  {g !== "全部" && patients.filter((p) => p.group === g).length > 0 && (
                    <span className="ml-1 opacity-70">
                      {patients.filter((p) => p.group === g).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSortMode(sortMode === "rounding" ? "bedNumber" : "rounding")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0"
              style={{
                backgroundColor: "var(--secondary)",
                color: "var(--secondary-foreground)",
                fontSize: "var(--font-size-small)",
                minHeight: "32px",
              }}
            >
              <ListFilter size={14} />
              {sortMode === "rounding" ? "查房序" : "床号序"}
            </button>
            {patients.length === 0 && (
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0"
                style={{
                  backgroundColor: "var(--secondary)",
                  color: "var(--secondary-foreground)",
                  fontSize: "var(--font-size-small)",
                  minHeight: "32px",
                }}
              >
                <Upload size={14} />
                导入
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Patient list */}
      <main className="flex-1 px-4 py-3">
        {filtered.length === 0 ? (
          <FadeIn>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Stethoscope size={48} style={{ color: "var(--muted-foreground)", marginBottom: "var(--spacing-md)" }} />
              <p style={{ fontSize: "var(--font-size-body)", color: "var(--muted-foreground)", marginBottom: "var(--spacing-sm)" }}>
                {patients.length === 0 ? "还没有病人" : "没有匹配的病人"}
              </p>
              <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", marginBottom: "var(--spacing-md)" }}>
                {patients.length === 0 ? "点击右上角 + 添加，或从外部批量导入" : "尝试调整筛选条件"}
              </p>
              <div className="flex gap-2">
                {patients.length === 0 && (
                  <button
                    onClick={() => setShowImport(true)}
                    className="px-4 py-2 rounded-lg flex items-center gap-2"
                    style={{
                      backgroundColor: "var(--secondary)",
                      color: "var(--secondary-foreground)",
                      fontSize: "var(--font-size-label)",
                      minHeight: "44px",
                    }}
                  >
                    <Upload size={16} />
                    批量导入
                  </button>
                )}
                <button
                  onClick={() => setShowAdd(true)}
                  className="px-4 py-2 rounded-lg flex items-center gap-2"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                    fontSize: "var(--font-size-label)",
                    minHeight: "44px",
                  }}
                >
                  <Plus size={16} />
                  {patients.length === 0 ? "添加病人" : "添加"}
                </button>
              </div>
            </div>
          </FadeIn>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((p, idx) => {
              const bloodAlert = getBloodAlert(p);
              const pendingCount = p.todos.filter((t) => !t.completed).length;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                  onClick={() => navigate(`/patient/${p.id}`)}
                  className="rounded-lg p-3 cursor-pointer active:scale-[0.985] transition-transform"
                  style={{
                    backgroundColor: "var(--card)",
                    border: bloodAlert?.level === "danger"
                      ? "1px solid var(--destructive)"
                      : "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Left: bed + name */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span
                        className="font-semibold whitespace-nowrap"
                        style={{ fontSize: "var(--font-size-body)", color: "var(--foreground)" }}
                      >
                        {p.bedNumber}
                      </span>
                      <span
                        className="truncate"
                        style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}
                      >
                        {p.name}
                      </span>
                    </div>

                    {/* Right: indicators */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Blood alert badge */}
                      {bloodAlert && (
                        <span
                          className="flex items-center gap-0.5 px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: bloodAlert.level === "danger"
                              ? "var(--destructive)"
                              : "var(--warning)",
                            color: bloodAlert.level === "danger" ? "white" : "var(--warning-foreground)",
                            fontSize: "var(--font-size-small)",
                            fontWeight: "var(--font-weight-semibold)",
                          }}
                        >
                          {bloodAlert.days}d
                        </span>
                      )}

                      {/* Todo count */}
                      {pendingCount > 0 && (
                        <span
                          className="px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                          style={{
                            backgroundColor: "var(--warning)",
                            color: "var(--warning-foreground)",
                            fontSize: "var(--font-size-small)",
                            fontWeight: "var(--font-weight-semibold)",
                          }}
                        >
                          {pendingCount}
                        </span>
                      )}

                      {/* Group tag */}
                      <span
                        className="px-2 py-0.5 rounded-full text-white"
                        style={{
                          backgroundColor: p.group === "解组" ? "var(--theme-blue)" : "var(--theme-green)",
                          fontSize: "var(--font-size-small)",
                          fontWeight: "var(--font-weight-medium)",
                        }}
                      >
                        {p.group}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Import shortcut in bottom-right */}
      {patients.length > 0 && (
        <button
          onClick={() => setShowImport(true)}
          className="fixed bottom-20 right-4 w-12 h-12 rounded-full shadow-lg flex items-center justify-center z-30 active:scale-95 transition-transform"
          style={{
            backgroundColor: "var(--secondary)",
            color: "var(--secondary-foreground)",
            boxShadow: "var(--ds-shadow-md)",
          }}
        >
          <Upload size={20} />
        </button>
      )}

      <AddPatientDialog open={showAdd} onOpenChange={setShowAdd} onAdd={addPatient} />
      <ImportTextDialog open={showImport} onOpenChange={setShowImport} />
    </div>
  );
}
