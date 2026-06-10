import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Stethoscope, ArrowUpDown, Filter } from "lucide-react";
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
  const [showFilter, setShowFilter] = useState(false);

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

  return (
    <div className="flex flex-col min-h-screen">
      <header
        className="sticky top-0 z-40 px-4 py-3"
        style={{
          backgroundColor: "var(--background)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Stethoscope size={22} style={{ color: "var(--primary)" }} />
            <h1 style={{ fontSize: "var(--font-size-title)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>
              病人列表
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
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
              <ArrowUpDown size={18} />
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="p-2 rounded-md"
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
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md"
            style={{
              backgroundColor: "var(--muted)",
              border: "1px solid var(--border)",
            }}
          >
            <Search size={16} style={{ color: "var(--muted-foreground)" }} />
            <input
              type="text"
              placeholder="搜索床号或姓名..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none"
              style={{ fontSize: "var(--font-size-label)", color: "var(--foreground)" }}
            />
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
                    minWidth: "140px",
                  }}
                >
                  {(["全部", "解组", "勇组"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => { setGroupFilter(g); setShowFilter(false); }}
                      className="block w-full text-left px-4 py-2.5"
                      style={{
                        fontSize: "var(--font-size-label)",
                        backgroundColor: groupFilter === g ? "var(--accent)" : "transparent",
                        color: "var(--foreground)",
                        minHeight: "44px",
                      }}
                    >
                      {g === "解组" && <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: "var(--theme-blue)" }} />}
                      {g === "勇组" && <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: "var(--theme-green)" }} />}
                      {g}
                    </button>
                  ))}
                  <div
                    className="px-4 py-2 border-t"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <button
                      onClick={() => { setSortMode(sortMode === "rounding" ? "bedNumber" : "rounding"); setShowFilter(false); }}
                      className="w-full text-left"
                      style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", minHeight: "44px" }}
                    >
                      排序: {sortMode === "rounding" ? "查房顺序" : "床号顺序"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-3">
        {filtered.length === 0 ? (
          <FadeIn>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Stethoscope size={48} style={{ color: "var(--muted-foreground)", marginBottom: "var(--spacing-md)" }} />
              <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}>
                {patients.length === 0 ? "还没有病人，点击 + 添加" : "没有匹配的病人"}
              </p>
            </div>
          </FadeIn>
        ) : (
          <div className="space-y-2">
            {filtered.map((p, idx) => {
              const bloodAlert = getBloodAlert(p);
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => navigate(`/patient/${p.id}`)}
                  className="rounded-lg p-4 cursor-pointer active:scale-[0.98] transition-transform"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                        {p.bedNumber}
                      </span>
                      <span style={{ fontSize: "var(--font-size-body)", color: "var(--foreground)" }}>
                        {p.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {bloodAlert && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs"
                          style={{
                            backgroundColor:
                              bloodAlert.level === "danger"
                                ? "var(--destructive)"
                                : "var(--warning)",
                            color:
                              bloodAlert.level === "danger"
                                ? "white"
                                : "var(--warning-foreground)",
                            fontSize: "var(--font-size-small)",
                          }}
                        >
                          {bloodAlert.days}天
                        </span>
                      )}
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: p.group === "解组" ? "var(--theme-blue)" : "var(--theme-green)",
                          color: "white",
                          fontSize: "var(--font-size-small)",
                        }}
                      >
                        {p.group}
                      </span>
                    </div>
                  </div>

                  {p.todos.filter((t) => !t.completed).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.todos
                        .filter((t) => !t.completed)
                        .slice(0, 3)
                        .map((t) => (
                          <span
                            key={t.id}
                            className="px-2 py-0.5 rounded text-xs"
                            style={{
                              backgroundColor: "var(--warning)",
                              color: "var(--warning-foreground)",
                              fontSize: "var(--font-size-small)",
                            }}
                          >
                            {t.content}
                          </span>
                        ))}
                      {p.todos.filter((t) => !t.completed).length > 3 && (
                        <span
                          style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}
                        >
                          +{p.todos.filter((t) => !t.completed).length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <AddPatientDialog open={showAdd} onOpenChange={setShowAdd} onAdd={addPatient} />
      <ImportTextDialog open={showImport} onOpenChange={setShowImport} />
    </div>
  );
}
