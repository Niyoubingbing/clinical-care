import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { useMemos } from "@/hooks/use-memos";
import { useDailySummary } from "@/hooks/use-daily-summary";
import { useDataManagement } from "@/hooks/use-data-management";
import { getRoundingOrder } from "@/lib/rounding";
import { toast } from "sonner";
import ImportTextDialog from "@/components/ImportTextDialog";

export default function QuickMenu() {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"menu" | "summary" | "memos" | "data" | "patients">("menu");
  const patients = useAppStore((s) => s.patients);
  const memos = useAppStore((s) => s.memos);
  const { addMemo, toggleMemo, deleteMemo } = useMemos();
  const { generateSummary, getSavedSummary, formatSummaryText, copyToClipboard } = useDailySummary();
  const { exportJSON, importJSON } = useDataManagement();
  const [customMemo, setCustomMemo] = useState("");
  const [showImport, setShowImport] = useState(false);

  const handleOpen = (p: typeof panel) => {
    setPanel(p);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setTimeout(() => setPanel("menu"), 300);
  };

  const sortedPatients = [...patients].sort((a, b) => getRoundingOrder(a.bedNumber) - getRoundingOrder(b.bedNumber));
  const activeMemos = memos.filter((m) => !m.completed);

  return (
    <>
      {/* Trigger button (top-right) */}
      <button
        onClick={() => handleOpen("menu")}
        className="fixed top-3 right-3 z-30 w-10 h-10 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-transform"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Side panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
            onClick={close}
          >
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 250 }}
              className="absolute top-0 right-0 bottom-0 w-[85vw] max-w-sm overflow-y-auto"
              style={{ backgroundColor: "var(--background)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                {/* Back button (if not menu) */}
                {panel !== "menu" && (
                  <button onClick={() => setPanel("menu")} className="mb-4 flex items-center gap-1"
                    style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                    返回
                  </button>
                )}

                {panel === "menu" && <MenuPanel onNavigate={handleOpen} onClose={close} patientCount={patients.length} memoCount={activeMemos.length} />}
                {panel === "summary" && <SummaryPanel onClose={close} generateSummary={generateSummary} getSavedSummary={getSavedSummary} formatSummaryText={formatSummaryText} copyToClipboard={copyToClipboard} />}
                {panel === "memos" && <MemosPanel memos={memos} activeMemos={activeMemos} customMemo={customMemo} setCustomMemo={setCustomMemo} addMemo={addMemo} toggleMemo={toggleMemo} deleteMemo={deleteMemo} />}
                {panel === "data" && <DataPanel exportJSON={exportJSON} importJSON={importJSON} onImportClick={() => setShowImport(true)} />}
                {panel === "patients" && <PatientsPanel patients={sortedPatients} onClose={close} />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImportTextDialog open={showImport} onOpenChange={setShowImport} />
    </>
  );
}

/* ── Sub-panels ── */

function MenuPanel({ onNavigate, onClose, patientCount, memoCount }: { onNavigate: (p: any) => void; onClose: () => void; patientCount: number; memoCount: number }) {
  const items = [
    { key: "patients", label: "病人总览", desc: `${patientCount} 位病人`, icon: "users" },
    { key: "summary", label: "每日小结", desc: "生成交班报告", icon: "file" },
    { key: "memos", label: "备忘录", desc: `${memoCount} 项进行中`, icon: "sticky" },
    { key: "data", label: "数据管理", desc: "导入 / 导出 / 备份", icon: "data" },
  ] as const;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 style={{ fontSize: "var(--font-size-title)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>菜单</h2>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-lg ripple">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-left ripple active:scale-[0.98] transition-transform"
            style={{ backgroundColor: "var(--secondary)" }}
          >
            <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--background)" }}>
              {item.icon === "users" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
              {item.icon === "file" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
              {item.icon === "sticky" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>}
              {item.icon === "data" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>}
            </span>
            <div className="min-w-0">
              <div style={{ fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-medium)", color: "var(--foreground)" }}>{item.label}</div>
              <div style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}>{item.desc}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" style={{ marginLeft: "auto" }}><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        ))}
      </div>
    </div>
  );
}

function PatientsPanel({ patients, onClose }: { patients: any[]; onClose: () => void }) {
  const { setGroupFilter } = useAppStore();

  return (
    <div>
      <h2 className="mb-3" style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
        病人总览 · {patients.length} 人
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {patients.map((p) => (
          <button
            key={p.id}
            onClick={() => { setGroupFilter(p.group); onClose(); }}
            className="p-2.5 rounded-xl text-left active:scale-95 transition-transform"
            style={{ backgroundColor: "var(--secondary)" }}
          >
            <div className="font-semibold" style={{ fontSize: "var(--font-size-label)", color: "var(--foreground)" }}>{p.bedNumber}</div>
            <div style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}>{p.name}</div>
            <span className="inline-block mt-1 px-1.5 py-0.5 rounded-full text-white" style={{
              backgroundColor: p.group === "解组" ? "var(--info)" : "var(--success)",
              fontSize: "10px",
            }}>{p.group}</span>
          </button>
        ))}
      </div>
      {patients.length === 0 && (
        <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", textAlign: "center", padding: "2rem 0" }}>还没有病人</p>
      )}
    </div>
  );
}

function SummaryPanel({ onClose, generateSummary, getSavedSummary, formatSummaryText, copyToClipboard }: any) {
  const [entries, setEntries] = useState<any[]>(() => {
    const s = getSavedSummary();
    const today = new Date().toISOString().slice(0, 10);
    return s?.date === today ? s.entries : [];
  });

  const handleGenerate = async () => {
    const r = await generateSummary();
    setEntries(r);
  };

  const today = new Date().toISOString().slice(0, 10);
  const total = entries.reduce((n: number, e: any) => n + e.completedTodos.length, 0);

  return (
    <div>
      <h2 className="mb-3" style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
        每日小结
      </h2>

      {entries.length === 0 ? (
        <div className="text-center py-8">
          <p className="mb-3" style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}>还没有今日小结</p>
          <button onClick={handleGenerate}
            className="px-4 py-2.5 rounded-xl font-medium ripple"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)", fontSize: "var(--font-size-label)" }}>
            生成小结
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-3" style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}>
            <span>{today}</span>
            <span>{entries.length} 人</span>
            <span>{total} 项完成</span>
          </div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto mb-4">
            {entries.map((e: any, i: number) => (
              <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: "var(--secondary)" }}>
                <div className="font-semibold mb-1" style={{ fontSize: "var(--font-size-label)", color: "var(--foreground)" }}>
                  {e.bedNumber} {e.name}
                </div>
                <div className="space-y-0.5">
                  {e.completedTodos.map((t: string, j: number) => (
                    <div key={j} className="flex items-center gap-1.5" style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {t}
                    </div>
                  ))}
                  {e.bloodChecked && <div className="flex items-center gap-1.5" style={{ fontSize: "var(--font-size-small)", color: "var(--info)" }}>🩸 今日已查血</div>}
                  {e.dressingChanged && <div className="flex items-center gap-1.5" style={{ fontSize: "var(--font-size-small)", color: "var(--info)" }}>🩹 已换药</div>}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleGenerate}
              className="flex-1 py-2.5 rounded-xl font-medium ripple"
              style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)", fontSize: "var(--font-size-label)" }}>
              刷新
            </button>
            <button onClick={() => { copyToClipboard(formatSummaryText(entries)); toast.success("已复制到剪贴板"); }}
              className="flex-1 py-2.5 rounded-xl font-medium ripple"
              style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)", fontSize: "var(--font-size-label)" }}>
              复制
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MemosPanel({ memos, activeMemos, customMemo, setCustomMemo, addMemo, toggleMemo, deleteMemo }: any) {
  return (
    <div>
      <h2 className="mb-3" style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
        备忘录
      </h2>

      <div className="flex gap-2 mb-4">
        <input type="text" placeholder="添加备忘录..." value={customMemo} onChange={(e: any) => setCustomMemo(e.target.value)}
          onKeyDown={(e: any) => { if (e.key === "Enter" && customMemo.trim()) { addMemo(customMemo.trim()); setCustomMemo(""); }}}
          className="flex-1 px-3 py-2 rounded-lg outline-none"
          style={{ backgroundColor: "var(--muted)", border: "1px solid var(--border)", fontSize: "var(--font-size-label)", color: "var(--foreground)" }}
        />
        <button onClick={() => { if (customMemo.trim()) { addMemo(customMemo.trim()); setCustomMemo(""); }}}
          className="px-3 py-2 rounded-lg font-medium ripple"
          style={{ backgroundColor: customMemo.trim() ? "var(--primary)" : "var(--secondary)", color: customMemo.trim() ? "var(--primary-foreground)" : "var(--secondary-foreground)", fontSize: "var(--font-size-label)" }}>
          添加
        </button>
      </div>

      {activeMemos.length === 0 ? (
        <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", textAlign: "center", padding: "1rem 0" }}>暂无备忘录</p>
      ) : (
        <div className="space-y-1.5">
          {activeMemos.map((m: any) => (
            <div key={m.id} className="flex items-center gap-2.5 p-2.5 rounded-lg" style={{ backgroundColor: "var(--secondary)" }}>
              <button onClick={() => toggleMemo(m.id)} className="w-5 h-5 rounded-full border-2 flex-shrink-0 ripple" style={{ borderColor: "var(--border)" }} />
              <span className="flex-1" style={{ fontSize: "var(--font-size-label)", color: "var(--foreground)" }}>{m.content}</span>
              <button onClick={() => deleteMemo(m.id)} className="p-1 rounded ripple">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DataPanel({ exportJSON, importJSON, onImportClick }: any) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = await importJSON(file);
    toast[r.success ? "success" : "error"](r.message);
    e.target.value = "";
  };

  return (
    <div>
      <h2 className="mb-3" style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
        数据管理
      </h2>
      <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
      <div className="space-y-2">
        <button onClick={exportJSON}
          className="w-full p-3 rounded-xl font-medium text-left ripple active:scale-[0.98] transition-transform"
          style={{ backgroundColor: "var(--secondary)" }}>
          <div style={{ fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-medium)", color: "var(--foreground)" }}>导出 JSON 备份</div>
          <div style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}>保存所有数据到本地</div>
        </button>
        <button onClick={() => fileRef.current?.click()}
          className="w-full p-3 rounded-xl font-medium text-left ripple active:scale-[0.98] transition-transform"
          style={{ backgroundColor: "var(--secondary)" }}>
          <div style={{ fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-medium)", color: "var(--foreground)" }}>导入 JSON 备份</div>
          <div style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}>从备份恢复数据</div>
        </button>
        <button onClick={onImportClick}
          className="w-full p-3 rounded-xl font-medium text-left ripple active:scale-[0.98] transition-transform"
          style={{ backgroundColor: "var(--secondary)" }}>
          <div style={{ fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-medium)", color: "var(--foreground)" }}>批量导入病人</div>
          <div style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}>粘贴 "-床号 姓名" 格式文本</div>
        </button>
      </div>
    </div>
  );
}
