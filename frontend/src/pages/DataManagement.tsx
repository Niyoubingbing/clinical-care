import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Download, Upload, FileText, AlertTriangle } from "lucide-react";
import { useDataManagement } from "@/hooks/use-data-management";
import { FadeIn } from "@/components/MotionPrimitives";
import { toast } from "sonner";
import type { Patient } from "@/types/patient";

export default function DataManagement() {
  const { exportJSON, importJSON, importText, confirmDelete } = useDataManagement();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportText, setShowImportText] = useState(false);
  const [importTextContent, setImportTextContent] = useState("");
  const [toDelete, setToDelete] = useState<Patient[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleExport = async () => {
    await exportJSON();
    toast.success("数据已导出");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importJSON(file);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    e.target.value = "";
  };

  const handleImportText = async () => {
    if (!importTextContent.trim()) return;
    const result = await importText(importTextContent);
    if (result.success) {
      if (result.toDelete && result.toDelete.length > 0) {
        setToDelete(result.toDelete);
        setShowDeleteConfirm(true);
      } else {
        toast.success(result.message);
        setShowImportText(false);
        setImportTextContent("");
      }
    } else {
      toast.error(result.message);
    }
  };

  const handleConfirmDelete = async () => {
    const ids = toDelete.map((p) => p.id);
    await confirmDelete(ids);
    toast.success(`已删除 ${ids.length} 位不在列表中的病人`);
    setShowDeleteConfirm(false);
    setShowImportText(false);
    setImportTextContent("");
    setToDelete([]);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header
        className="sticky top-0 z-40 px-4 py-3"
        style={{
          backgroundColor: "var(--background)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2">
          <Database size={22} style={{ color: "var(--primary)" }} />
          <h1 style={{ fontSize: "var(--font-size-title)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>
            数据管理
          </h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-3 space-y-4">
        {/* Export */}
        <FadeIn>
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            <h3 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", marginBottom: "var(--spacing-sm)" }}>
              导出备份
            </h3>
            <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", marginBottom: "var(--spacing-md)" }}>
              导出完整数据（病人信息、待办、查血记录）为 JSON 文件
            </p>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-3 rounded-md w-full"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
                fontSize: "var(--font-size-label)",
                minHeight: "48px",
                justifyContent: "center",
              }}
            >
              <Download size={18} />
              导出 JSON
            </button>
          </div>
        </FadeIn>

        {/* Import JSON */}
        <FadeIn>
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            <h3 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", marginBottom: "var(--spacing-sm)" }}>
              导入备份
            </h3>
            <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", marginBottom: "var(--spacing-md)" }}>
              从 JSON 备份文件恢复数据（会覆盖当前数据）
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-3 rounded-md w-full"
              style={{
                backgroundColor: "var(--secondary)",
                color: "var(--secondary-foreground)",
                fontSize: "var(--font-size-label)",
                minHeight: "48px",
                justifyContent: "center",
              }}
            >
              <Upload size={18} />
              导入 JSON
            </button>
          </div>
        </FadeIn>

        {/* Import Text */}
        <FadeIn>
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            <h3 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", marginBottom: "var(--spacing-sm)" }}>
              文本批量导入
            </h3>
            <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", marginBottom: "var(--spacing-md)" }}>
              使用格式 "-床号 姓名" 每行一个病人
            </p>
            <button
              onClick={() => setShowImportText(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-md w-full"
              style={{
                backgroundColor: "var(--secondary)",
                color: "var(--secondary-foreground)",
                fontSize: "var(--font-size-label)",
                minHeight: "48px",
                justifyContent: "center",
              }}
            >
              <FileText size={18} />
              文本导入
            </button>
          </div>
        </FadeIn>

        {/* Import Text Dialog */}
        <AnimatePresence>
          {showImportText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
              onClick={(e) => e.target === e.currentTarget && setShowImportText(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="w-full sm:max-w-md rounded-t-xl sm:rounded-xl p-4 max-h-[80vh] overflow-y-auto"
                style={{ backgroundColor: "var(--background)" }}
              >
                <h2 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", marginBottom: "var(--spacing-md)" }}>
                  粘贴病人列表
                </h2>
                <textarea
                  value={importTextContent}
                  onChange={(e) => setImportTextContent(e.target.value)}
                  placeholder={"-309W11 程霞荣\n-309W12 张三\n-309W13 李四"}
                  rows={8}
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
                    onClick={() => { setShowImportText(false); setImportTextContent(""); }}
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
                    onClick={handleImportText}
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

        {/* Delete Confirm Dialog */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="w-[90vw] max-w-sm rounded-xl p-4"
                style={{ backgroundColor: "var(--background)" }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle size={24} style={{ color: "var(--destructive)" }} />
                  <h3 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                    确认删除
                  </h3>
                </div>
                <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", marginBottom: "var(--spacing-sm)" }}>
                  以下病人不在导入列表中，将被删除：
                </p>
                <div className="max-h-40 overflow-y-auto mb-3">
                  {toDelete.map((p) => (
                    <div key={p.id} style={{ fontSize: "var(--font-size-label)", color: "var(--foreground)", padding: "4px 0" }}>
                      {p.bedNumber} {p.name}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
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
                    onClick={handleConfirmDelete}
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
      </main>
    </div>
  );
}
