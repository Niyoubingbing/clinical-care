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
          <FileText size={22} style={{ color: "var(--primary)" }} />
          <h1 style={{ fontSize: "var(--font-size-title)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>
            每日小结
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
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
            <RefreshCw size={18} />
          </button>
          <button
            onClick={handleCopy}
            className="p-2 rounded-md"
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
      </header>

      <main className="flex-1 px-4 py-3">
        <FadeIn>
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="font-mono whitespace-pre-wrap leading-relaxed"
              style={{ fontSize: "var(--font-size-label)", color: "var(--foreground)" }}
            >
              {entries.length === 0 ? (
                <div className="text-center py-8" style={{ color: "var(--muted-foreground)" }}>
                  <p>今日暂无动态</p>
                  <p style={{ fontSize: "var(--font-size-small)", marginTop: "var(--spacing-xs)" }}>
                    完成待办、录入查血或确认换药后会自动生成小结
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: "var(--font-weight-bold)", marginBottom: "var(--spacing-sm)" }}>
                    📅 {today} 工作小结
                  </div>
                  <div className="space-y-3">
                    {entries.map((entry, idx) => (
                      <motion.div
                        key={entry.bedNumber}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <div style={{ fontWeight: "var(--font-weight-semibold)" }}>
                          👤 {entry.bedNumber} {entry.name}
                        </div>
                        {entry.completedTodos.map((todo, ti) => (
                          <div key={ti} style={{ paddingLeft: "var(--spacing-lg)", color: "var(--success)" }}>
                            ✅ {todo}
                          </div>
                        ))}
                        {entry.bloodChecked && (
                          <div style={{ paddingLeft: "var(--spacing-lg)", color: "var(--info)" }}>
                            💉 今日已查血
                          </div>
                        )}
                        {entry.dressingChanged && (
                          <div style={{ paddingLeft: "var(--spacing-lg)", color: "var(--info)" }}>
                            🩹 已换药
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </FadeIn>
      </main>
    </div>
  );
}
