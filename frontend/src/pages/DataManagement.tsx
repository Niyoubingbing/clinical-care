import { useState, useRef } from "react";
import { Download, Upload, FileText, Settings } from "lucide-react";
import { useDataManagement } from "@/hooks/use-data-management";
import { FadeIn } from "@/components/MotionPrimitives";
import ImportTextDialog from "@/components/ImportTextDialog";
import { toast } from "sonner";

export default function DataManagement() {
  const { exportJSON, importJSON } = useDataManagement();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImport, setShowImport] = useState(false);

  const handleExport = async () => {
    await exportJSON();
    toast.success("数据已导出");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importJSON(file);
    toast[result.success ? "success" : "error"](result.message);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header
        className="sticky top-0 z-40 px-4 py-3"
        style={{ backgroundColor: "var(--background)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <Settings size={22} style={{ color: "var(--primary)" }} />
          <h1 style={{ fontSize: "var(--font-size-title)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>
            设置
          </h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-3 space-y-3">
        <FadeIn>
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            <h3 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", marginBottom: "2px" }}>
              导出备份
            </h3>
            <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", marginBottom: "var(--spacing-sm)" }}>
              将所有病人及备忘录数据导出为 JSON 文件
            </p>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-3 rounded-lg w-full justify-center active:scale-[0.98] transition-transform"
              style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)", fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-medium)", minHeight: "48px" }}
            >
              <Download size={18} />导出 JSON
            </button>
          </div>
        </FadeIn>

        <FadeIn>
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            <h3 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", marginBottom: "2px" }}>
              恢复备份
            </h3>
            <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", marginBottom: "var(--spacing-sm)" }}>
              从先前导出的 JSON 文件恢复所有数据
            </p>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-3 rounded-lg w-full justify-center active:scale-[0.98] transition-transform"
              style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)", fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-medium)", minHeight: "48px" }}
            >
              <Upload size={18} />导入 JSON 文件
            </button>
          </div>
        </FadeIn>

        <FadeIn>
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            <h3 style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", marginBottom: "2px" }}>
              批量导入病人
            </h3>
            <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)", marginBottom: "var(--spacing-sm)" }}>
              粘贴格式：<code style={{ backgroundColor: "var(--muted)", padding: "2px 6px", borderRadius: "4px", fontSize: "var(--font-size-small)", fontFamily: "monospace" }}>-床号 姓名</code>，每行一个
            </p>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-lg w-full justify-center active:scale-[0.98] transition-transform"
              style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)", fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-medium)", minHeight: "48px" }}
            >
              <FileText size={18} />粘贴导入
            </button>
          </div>
        </FadeIn>
      </main>

      <ImportTextDialog open={showImport} onOpenChange={setShowImport} />
    </div>
  );
}
