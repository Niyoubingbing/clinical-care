import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
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

  // Reset state and auto-focus when dialog opens
  useEffect(() => {
    if (open) {
      setContent("");
      setToDelete([]);
      setShowConfirm(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  const handleImport = async () => {
    if (!content.trim()) {
      toast.error("请输入病人列表");
      return;
    }
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
    const ids = toDelete.map((p) => p.id);
    await confirmDelete(ids);
    toast.success(`已删除 ${ids.length} 位病人`);
    onOpenChange(false);
  };

  return (
    <>
      {/* Import sheet */}
      <AnimatePresence>
        {open && !showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                if (content.trim()) {
                  if (window.confirm("内容未保存，确定关闭吗？")) onOpenChange(false);
                } else {
                  onOpenChange(false);
                }
              }
            }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full sm:max-w-md rounded-t-xl sm:rounded-xl p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[80vh] overflow-y-auto"
              style={{ backgroundColor: "var(--background)" }}
            >
              {/* Title bar */}
              <div className="flex items-center justify-between mb-4">
                <h2
                  style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}
                >
                  批量导入
                </h2>
                <button
                  onClick={() => {
                    if (content.trim() && !window.confirm("内容未保存，确定关闭吗？")) return;
                    onOpenChange(false);
                  }}
                  className="flex items-center justify-center rounded-lg active:bg-muted transition-colors"
                  style={{ width: "44px", height: "44px" }}
                >
                  <X size={20} style={{ color: "var(--muted-foreground)" }} />
                </button>
              </div>

              {/* Hint */}
              <div className="rounded-lg p-2 mb-3 flex items-start gap-2" style={{ backgroundColor: "var(--muted)" }}>
                <span style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)", lineHeight: "1.6" }}>
                  格式：<code style={{ backgroundColor: "var(--secondary)", padding: "1px 6px", borderRadius: "3px", fontSize: "var(--font-size-small)" }}>-床号 姓名</code>
                  <br />已存在的同名病人仅更新床号，未出现的将被标记删除。
                </span>
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={"-309W11 程霞荣\n-309W12 张三\n-309W13 李四"}
                rows={10}
                className="w-full p-3 rounded-lg outline-none resize-none mb-3 transition-colors"
                style={{
                  backgroundColor: "var(--muted)",
                  border: `1.5px solid ${content.trim() ? "var(--primary)" : "var(--border)"}`,
                  fontSize: "var(--font-size-label)",
                  color: "var(--foreground)",
                  fontFamily: '"SF Mono", "Cascadia Code", monospace',
                  lineHeight: 1.7,
                }}
              />

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => onOpenChange(false)}
                  className="flex-1 py-3 rounded-lg transition-transform active:scale-[0.98]"
                  style={{
                    backgroundColor: "var(--secondary)",
                    color: "var(--secondary-foreground)",
                    fontSize: "var(--font-size-label)",
                    fontWeight: "var(--font-weight-medium)",
                    minHeight: "48px",
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleImport}
                  className="flex-1 py-3 rounded-lg transition-transform active:scale-[0.98]"
                  style={{
                    backgroundColor: content.trim() ? "var(--primary)" : "var(--muted)",
                    color: content.trim() ? "var(--primary-foreground)" : "var(--muted-foreground)",
                    fontSize: "var(--font-size-label)",
                    fontWeight: "var(--font-weight-medium)",
                    minHeight: "48px",
                  }}
                >
                  导入
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-[90vw] max-w-sm rounded-xl p-4 mx-4"
              style={{ backgroundColor: "var(--background)", boxShadow: "var(--ds-shadow-lg)" }}
            >
              <h3
                style={{
                  fontSize: "var(--font-size-body)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--foreground)",
                  marginBottom: "var(--spacing-xs)",
                }}
              >
                以下病人将被删除
              </h3>
              <p style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)", marginBottom: "var(--spacing-sm)" }}>
                未在导入列表中出现，确认删除？
              </p>
              <div className="max-h-40 overflow-y-auto mb-3 rounded-lg" style={{ backgroundColor: "var(--muted)", padding: "6px 10px" }}>
                {toDelete.map((p) => (
                  <div
                    key={p.id}
                    className="py-1 border-b last:border-b-0"
                    style={{
                      fontSize: "var(--font-size-label)",
                      color: "var(--foreground)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <span style={{ fontWeight: "var(--font-weight-medium)" }}>{p.bedNumber}</span>{" "}
                    <span style={{ color: "var(--muted-foreground)" }}>{p.name}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 rounded-lg transition-transform active:scale-[0.98]"
                  style={{
                    backgroundColor: "var(--secondary)",
                    color: "var(--secondary-foreground)",
                    fontSize: "var(--font-size-label)",
                    fontWeight: "var(--font-weight-medium)",
                    minHeight: "48px",
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 rounded-lg transition-transform active:scale-[0.98]"
                  style={{
                    backgroundColor: "var(--destructive)",
                    color: "white",
                    fontSize: "var(--font-size-label)",
                    fontWeight: "var(--font-weight-medium)",
                    minHeight: "48px",
                  }}
                >
                  确认删除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
