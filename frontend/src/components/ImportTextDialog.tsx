import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDataManagement } from "@/hooks/use-data-management";
import { toast } from "sonner";
import type { Patient } from "@/types/patient";

interface ImportTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImportTextDialog({ open, onOpenChange }: ImportTextDialogProps) {
  const { importText, confirmDelete } = useDataManagement();
  const [content, setContent] = useState("");
  const [toDelete, setToDelete] = useState<Patient[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setContent("");
      setToDelete([]);
      setShowConfirm(false);
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [open]);

  const handleImport = async () => {
    if (!content.trim()) { toast.error("请输入病人列表"); return; }
    const result = await importText(content);
    if (result.success) {
      if (result.toDelete && result.toDelete.length > 0) {
        setToDelete(result.toDelete);
        setShowConfirm(true);
      } else {
        toast.success(result.message);
        onOpenChange(false);
      }
    } else {
      toast.error(result.message);
    }
  };

  const handleConfirm = async () => {
    await confirmDelete(toDelete.map((p) => p.id));
    toast.success(`已删除 ${toDelete.length} 位病人`);
    onOpenChange(false);
  };

  return (
    <>
      <AnimatePresence>
        {open && !showConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{ backgroundColor: "rgba(15,23,42,0.35)", backdropFilter: "blur(2px)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                if (content.trim() && !window.confirm("内容未保存，确定关闭？")) return;
                onOpenChange(false);
              }
            }}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto"
              style={{ backgroundColor: "var(--background)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>批量导入病人</h2>
                <button
                  onClick={() => {
                    if (content.trim() && !window.confirm("内容未保存，确定关闭？")) return;
                    onOpenChange(false);
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-secondary transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Format hints */}
              <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>支持的格式（自动识别）</p>
                <div className="space-y-1 text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "monospace", lineHeight: 1.6 }}>
                  <div><span className="inline-block w-24">-309W11 程霞荣</span><span className="opacity-50">带前导符</span></div>
                  <div><span className="inline-block w-24">309W11 程霞荣</span><span className="opacity-50">空格分隔</span></div>
                  <div><span className="inline-block w-24">309W11,程霞荣</span><span className="opacity-50">逗号分隔</span></div>
                  <div><span className="inline-block w-24">程霞荣 309W11</span><span className="opacity-50">姓名在前</span></div>
                  <div><span className="inline-block w-24">309W11&nbsp;&nbsp;&nbsp;&nbsp;程霞荣</span><span className="opacity-50">Tab 分隔</span></div>
                </div>
              </div>

              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={"粘贴病人列表...\n-309W11 程霞荣\n309W12,张三\n李四 309W13"}
                rows={10}
                className="w-full p-3.5 rounded-xl outline-none resize-none mb-4 transition-all text-sm"
                style={{
                  backgroundColor: "var(--card)",
                  border: `1.5px solid ${content.trim() ? "var(--primary)" : "var(--border)"}`,
                  fontSize: "var(--font-size-label)",
                  color: "var(--foreground)",
                  fontFamily: "'SF Mono', 'Cascadia Code', 'Consolas', monospace",
                  lineHeight: 1.8,
                  boxShadow: content.trim() ? "0 0 0 3px rgba(13,148,136,0.08)" : "none",
                }}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => onOpenChange(false)}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
                  style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)" }}
                >取消</button>
                <button
                  onClick={handleImport}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
                  style={{
                    backgroundColor: content.trim() ? "var(--primary)" : "var(--secondary)",
                    color: content.trim() ? "var(--primary-foreground)" : "var(--muted-foreground)",
                    boxShadow: content.trim() ? "0 2px 8px rgba(13,148,136,0.25)" : "none",
                  }}
                >导入</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm delete dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: "rgba(15,23,42,0.35)", backdropFilter: "blur(2px)" }}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-[90vw] max-w-sm rounded-2xl p-5 mx-4"
              style={{ backgroundColor: "var(--background)", boxShadow: "var(--shadow-elevated-css)" }}
            >
              <h3 className="text-lg font-bold mb-1" style={{ color: "var(--foreground)" }}>确认删除</h3>
              <p className="text-sm mb-3" style={{ color: "var(--muted-foreground)" }}>
                以下 {toDelete.length} 位病人未在导入列表中：
              </p>
              <div className="max-h-36 overflow-y-auto mb-4 rounded-xl p-2" style={{ backgroundColor: "var(--secondary)" }}>
                {toDelete.map((p) => (
                  <div key={p.id} className="py-1 px-2 text-sm" style={{ color: "var(--foreground)" }}>
                    <span className="font-semibold">{p.bedNumber}</span>{" "}
                    <span style={{ color: "var(--muted-foreground)" }}>{p.name}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                  style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)" }}>取消</button>
                <button onClick={handleConfirm}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                  style={{ backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)" }}>确认删除</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
