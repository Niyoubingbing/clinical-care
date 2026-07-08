"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Sun,
  Moon,
  Monitor,
  ArrowRight,
  Download,
  Upload,
  Trash2,
  ListOrdered,
  ScanLine,
  Zap,
  Users,
} from "lucide-react";
import { db, getSettings, updateSettings } from "@/lib/db";
import {
  exportClinicalData,
  readFileAsText,
  parseClinicalJSON,
  importClinicalData,
  resetAllData,
  ParsedClinical,
} from "@/lib/export-import";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useApp } from "@/components/Providers";
import { Theme } from "@/types";

const THEMES: { key: Theme; label: string; icon: typeof Sun }[] = [
  { key: "light", label: "浅色", icon: Sun },
  { key: "dark", label: "深色", icon: Moon },
  { key: "system", label: "系统", icon: Monitor },
];

export default function SettingsPage() {
  const { toast, update } = useApp();
  const settings = useLiveQuery(() => getSettings(), []);
  const patients = useLiveQuery(() => db.patients.toArray(), []) ?? [];
  const todos = useLiveQuery(() => db.todos.toArray(), []) ?? [];

  const fileRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<ParsedClinical | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  const setTheme = (theme: Theme) => updateSettings({ theme });

  const onExport = () => {
    exportClinicalData(patients, todos);
    toast({ message: "已导出数据" });
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const data = parseClinicalJSON(text);
      setImportData(data);
    } catch (err) {
      toast({ message: "导入格式有误，请检查" });
    } finally {
      e.target.value = "";
    }
  };

  const doImport = async () => {
    if (!importData) return;
    await importClinicalData(importData);
    toast({ message: "导入完成" });
    setImportData(null);
  };

  const doClear = async () => {
    await resetAllData();
    setClearOpen(false);
    toast({ message: "已清除所有数据" });
  };

  return (
    <div className="space-y-5">
      <h1 className="text-[20px] font-semibold text-main">设置</h1>

      <Section title="主题">
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const active = settings?.theme === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                className={`flex flex-col items-center gap-1.5 rounded-xl py-3 transition active:scale-[0.97] ${
                  active
                    ? "bg-primary text-white"
                    : "bg-card border border-border/60 text-muted"
                }`}
              >
                <Icon size={20} />
                <span className="text-[12px] font-medium">{t.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="查房与识别">
        <EntryLink href="/settings/rounding" icon={ListOrdered} label="查房顺序" />
        <EntryLink href="/settings/bed-recognition" icon={ScanLine} label="床号识别" />
        <EntryLink href="/settings/quick-todos" icon={Zap} label="快捷待办" />
        <EntryLink href="/settings/groups" icon={Users} label="分组管理" />
      </Section>

      <Section title="数据管理">
        <button
          className="flex w-full items-center gap-3 rounded-xl bg-card p-3 text-left text-[14px] text-main shadow-xs"
          onClick={onExport}
        >
          <Download size={18} className="text-primary" />
          导出数据
        </button>
        <button
          className="flex w-full items-center gap-3 rounded-xl bg-card p-3 text-left text-[14px] text-main shadow-xs"
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={18} className="text-primary" />
          导入数据
        </button>
        <button
          className="flex w-full items-center gap-3 rounded-xl bg-card p-3 text-left text-[14px] text-danger shadow-xs"
          onClick={() => setClearOpen(true)}
        >
          <Trash2 size={18} />
          清除所有数据
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={onFile}
        />
      </Section>

      <Section title="关于应用">
        <div className="card space-y-3 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted">当前版本</span>
            <span className="text-[14px] font-semibold text-main">
              v{update.localVersion ?? "—"}
            </span>
          </div>

          {update.state === "available" && (
            <div className="rounded-xl bg-primary/10 px-3 py-2">
              <p className="text-[13px] font-medium text-primary">
                发现新版本 v{update.remoteVersion ?? "?"}
              </p>
              <p className="mt-0.5 text-[12px] text-muted">
                已后台下载完成，旧版本仍可正常运行。点击「更新应用」将应用新版本并刷新页面，本地数据全部保留。
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              className="btn-secondary h-10 flex-1"
              onClick={update.checkForUpdate}
              disabled={update.state === "checking"}
            >
              {update.state === "checking" ? "检查中…" : "检查更新"}
            </button>
            {update.state === "available" && (
              <button
                className="btn-primary h-10 flex-1"
                onClick={update.applyUpdate}
              >
                更新应用
              </button>
            )}
          </div>

          {update.state === "latest" && (
            <p className="text-[12px] text-muted">已是最新版本</p>
          )}
          {update.state === "error" && (
            <p className="text-[12px] text-danger">检查更新失败，请重试</p>
          )}
        </div>
      </Section>

      <ConfirmDialog
        open={!!importData}
        title="导入数据？"
        message={
          importData ? (
            <div>
              <p>将覆盖当前数据：</p>
              <p className="mt-1">
                待导入 病人 {importData.patients.length} · 待办{" "}
                {importData.todos.length}
              </p>
            </div>
          ) : (
            ""
          )
        }
        confirmText="导入"
        onConfirm={doImport}
        onCancel={() => setImportData(null)}
      />

      <ConfirmDialog
        open={clearOpen}
        title="清除所有数据？"
        message="将清空病人与待办，并重置查房顺序与快捷待办。此操作不可撤销。"
        confirmText="清除"
        danger
        onConfirm={doClear}
        onCancel={() => setClearOpen(false)}
      />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-2 px-1 text-[13px] font-medium text-muted">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function EntryLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Sun;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl bg-card p-3 text-left text-[14px] text-main shadow-xs transition active:scale-[0.98]"
    >
      <Icon size={18} className="text-primary" />
      <span className="flex-1">{label}</span>
      <ArrowRight size={16} className="text-muted" />
    </Link>
  );
}
