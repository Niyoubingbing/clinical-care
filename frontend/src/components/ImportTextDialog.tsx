import { useState } from "react";
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

  const handleImport = async () => {
    if (!content.trim()) return;
    const result = await importText(content);
    if (result.success) {
      if (result.toDelete && result.toDelete.length > 0) {
        setToDelete(result.toDelete);
        setShowConfirm(true);
      } else {
        toast.success(result.message);
        onOpenChange(false);
        setContent("");
      }
    } else {
      toast.error(result.message);
    }
  };

  const handleConfirm = async () => {
    const ids = toDelete.map((p) => p.id);
    await confirmDelete(ids);
    toast.success(`已删除 ${ids.length} 位病人`);
    setShowConfirm(false);
    onOpenChange(false);
    setContent("");
    setToDelete([]);
  };

  return (
    <>
      <AnimatePresence>
        {open && !showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full sm:max-w-md rounded-t-xl sm:rounded-xl p-4 pb-20 max-h-[80vh] overflow-y-auto"
              style={{ backgroundColor: "var(--background)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                  批量导入
                </h2>
                <button onClick={() => onOpenChange(false)} style={{ minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={20} style={{ color: "var(--muted-foreground)" }} />
                </button>
              </div>
              <p style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)", marginBottom: "var(--spacing-sm)" }}>
                格式: -床号 姓名（每行一个）
              </p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={"-309W11 程霞荣\n-309W12 张三"}
                rows={10}
                className="w-full p-3 rounded-md outline-none resize-none mb-3"
                style={{
                  backgroundColor: "var(--muted)",
                  border: "1px solid var(--border)",
                  fontSize: "var(--font-size-label)",
                  color: "var(--foreground)",
                  fontFamily: "monospace",
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { onOpenChange(false); setContent(""); }}
                  className="flex-1 py-3 rounded-md"
                  style={{
                    backgroundColor: "var(--secondary)",
                    color: "var(--secondary-foreground)",
                    fontSize: "var(--font-size-label)",
                    minHeight: "48px",
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleImport}
                  className="flex-1 py-3 rounded-md"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                    fontSize: "var(--font-size-label)",
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
              className="w-[90vw] max-w-sm rounded-xl p-4"
              style={{ backgroundColor: "var(--background)" }}
            >
              <h3 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", marginBottom: "var(--spacing-sm)" }}>
                以下病人将被删除
              </h3>
              <div className="max-h-40 overflow-y-auto mb-3">
                {toDelete.map((p) => (
                  <div key={p.id} style={{ fontSize: "var(--font-size-label)", color: "var(--foreground)", padding: "4px 0" }}>
                    {p.bedNumber} {p.name}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 rounded-md"
                  style={{
                    backgroundColor: "var(--secondary)",
                    color: "var(--secondary-foreground)",
                    fontSize: "var(--font-size-label)",
                    minHeight: "48px",
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 rounded-md"
                  style={{
                    backgroundColor: "var(--destructive)",
                    color: "white",
                    fontSize: "var(--font-size-label)",
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
