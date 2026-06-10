import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Copy, RefreshCw, Check } from "lucide-react";
import { useDailySummary } from "@/hooks/use-daily-summary";
import { FadeIn } from "@/components/MotionPrimitives";
import { toast } from "sonner";
import type { SummaryEntry } from "@/types/patient";

export default function DailySummaryPage() {
  const { generateSummary, getSavedSummary, formatSummaryText, copyToClipboard } = useDailySummary();
  const [entries, setEntries] = useState<SummaryEntry[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = getSavedSummary();
    if (saved) {
      const today = new Date().toISOString().slice(0, 10);
      if (saved.date === today) {
        setEntries(saved.entries);
        return;
      }
    }
    generateSummary().then(setEntries);
  }, []);

  const handleRefresh = async () => {
    const result = await generateSummary();
    setEntries(result);
    toast.success("小结已更新");
  };

  const handleCopy = async () => {
    const text = formatSummaryText(entries);
    await copyToClipboard(text);
    setCopied(true);
    toast.success("已复制到剪贴板");
    setTimeout(() => setCopied(false), 2000);
  };

  const today = new Date().toISOString().slice(0, 10);
  const totalCompleted = entries.reduce((sum, e) => sum + e.completedTodos.length, 0);
  const totalBlood = entries.filter((e) => e.bloodChecked).length;

  return (
    <div className="flex flex-col min-h-screen">
      <header
        className="sticky top-0 z-40"
        style={{ backgroundColor: "var(--background)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={22} style={{ color: "var(--primary)" }} />
            <h1 style={{ fontSize: "var(--font-size-title)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>
              每日小结
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg"
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
              <RefreshCw size={18} />
            </button>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg"
              style={{
                backgroundColor: copied ? "var(--success)" : "var(--primary)",
                color: "var(--primary-foreground)",
                minWidth: "44px",
                minHeight: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>

        {/* Stats row */}
        {entries.length > 0 && (
          <div className="px-4 pb-3 flex items-center gap-4" style={{ fontSize: "var(--font-size-small)" }}>
            <span style={{ color: "var(--muted-foreground)" }}>
              <strong style={{ color: "var(--foreground)" }}>{entries.length}</strong> 位病人有动态
            </span>
            <span style={{ color: "var(--success)" }}>
              <strong>{totalCompleted}</strong> 项已完成
            </span>
            {totalBlood > 0 && (
              <span style={{ color: "var(--info)" }}>
                <strong>{totalBlood}</strong> 人已查血
              </span>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 px-4 py-3">
        <FadeIn>
          {entries.length === 0 ? (
            <div
              className="rounded-lg p-8 text-center"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
            >
              <FileText size={48} style={{ color: "var(--muted-foreground)", margin: "0 auto 12px", opacity: 0.4 }} />
              <p style={{ fontSize: "var(--font-size-body)", color: "var(--muted-foreground)", marginBottom: "4px" }}>
                今日暂无动态
              </p>
              <p style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)" }}>
                完成待办、录入查血或确认换药后会自动生成小结
              </p>
            </div>
          ) : (
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
            >
              {/* Title */}
              <div className="text-center pb-3 mb-3 border-b" style={{ borderColor: "var(--border)" }}>
                <div style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>
                  {today} 工作小结
                </div>
              </div>

              {/* Entries */}
              <div className="space-y-4">
                {entries.map((entry, idx) => (
                  <motion.div
                    key={entry.bedNumber}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    {/* Patient header */}
                    <div
                      className="flex items-center gap-2 pb-1.5 mb-1.5"
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <span style={{
                        fontSize: "var(--font-size-body)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--foreground)",
                      }}>
                        {entry.bedNumber}
                      </span>
                      <span style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}>
                        {entry.name}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="space-y-1 pl-2">
                      {entry.completedTodos.map((todo, ti) => (
                        <div key={ti} className="flex items-center gap-2 py-1">
                          <Check size={14} style={{ color: "var(--success)", flexShrink: 0 }} />
                          <span style={{ fontSize: "var(--font-size-label)", color: "var(--foreground)" }}>
                            {todo}
                          </span>
                        </div>
                      ))}
                      {entry.bloodChecked && (
                        <div className="flex items-center gap-2 py-1">
                          <DropletIcon />
                          <span style={{ fontSize: "var(--font-size-label)", color: "var(--info)" }}>
                            今日已查血
                          </span>
                        </div>
                      )}
                      {entry.dressingChanged && (
                        <div className="flex items-center gap-2 py-1">
                          <BandageIcon />
                          <span style={{ fontSize: "var(--font-size-label)", color: "var(--info)" }}>
                            已换药
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t text-center" style={{ borderColor: "var(--border)" }}>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                    fontSize: "var(--font-size-label)",
                    minHeight: "44px",
                  }}
                >
                  <Copy size={16} />
                  一键复制交班小结
                </button>
              </div>
            </div>
          )}
        </FadeIn>
      </main>
    </div>
  );
}

function DropletIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>
  );
}

function BandageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M12 2v20M2 12h20"/>
    </svg>
  );
}
