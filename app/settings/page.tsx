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
  ChevronDown,
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
import { Theme, DressingSchedule } from "@/types";

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
  // 换药规则分区默认展开，可折叠以节省空间（入口仍保持在 Settings 内，不独立成路由）。
  const [dressingOpen, setDressingOpen] = useState(true);

  const setTheme = (theme: Theme) => updateSettings({ theme });

  const updateSchedule = (patch: Partial<DressingSchedule>) => {
    if (!settings) return;
    const next: DressingSchedule = { ...settings.dressingSchedule, ...patch };
    if (
      Number.isInteger(next.earlyInterval) &&
      next.earlyInterval >= 1 &&
      Number.isInteger(next.laterInterval) &&
      next.laterInterval >= 1 &&
      Number.isInteger(next.maxDay) &&
      next.maxDay >= 1
    ) {
      updateSettings({ dressingSchedule: next });
    }
  };

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
    } catch {
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
    <div className="settings-page space-y-6">
      <header className="page-intro">
        <p className="page-kicker">工作区</p>
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-main">
          设置
        </h1>
        <p className="mt-1 text-[13px] leading-5 text-muted">
          管理查房路线、提醒规则、数据备份和应用偏好。
        </p>
      </header>

      <Section title="界面" description="调整应用的显示方式。">
        <div className="card p-1.5">
          <div className="grid grid-cols-3 gap-1.5">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const active = settings?.theme === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                className={`flex min-w-0 flex-col items-center gap-1.5 rounded-xl py-3 transition active:scale-[0.97] ${
                  active
                    ? "liquid-pill-active !bg-[#7a301b] !text-white"
                    : "liquid-panel text-muted"
                }`}
                style={active ? { backgroundColor: "#7a301b", color: "#ffffff" } : undefined}
              >
                <Icon size={20} />
                <span className="text-[12px] font-medium">{t.label}</span>
              </button>
            );
          })}
          </div>
        </div>
      </Section>

      <Section
        title="临床工作流"
        description="这些设置会直接影响首页查房顺序、床型判断和病人详情操作。"
      >
        <div className="settings-list card p-1">
          <EntryLink
            href="/settings/rounding"
            icon={ListOrdered}
            label="查房顺序"
            description="排列病房块、真实加床和实际查房路线"
          />
          <EntryLink
            href="/settings/bed-recognition"
            icon={ScanLine}
            label="床号识别"
            description="管理床号模板、床型和虚拟床覆盖"
          />
          <EntryLink
            href="/settings/quick-todos"
            icon={Zap}
            label="快捷待办"
            description="配置病人详情页常用的待办按钮"
          />
          <EntryLink
            href="/settings/groups"
            icon={Users}
            label="分组管理"
            description="维护分组名称、颜色和显示顺序"
          />
        </div>
      </Section>

      {/* 换药规则：Settings 内独立、突出、可折叠的分区卡片（非独立路由）。 */}
      <section className="settings-feature rounded-2xl border border-primary/30 bg-primary/[0.04] p-4">
        <button
          type="button"
          onClick={() => setDressingOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
          aria-expanded={dressingOpen}
        >
          <div className="flex min-w-0 flex-col">
            <span className="text-[15px] font-semibold text-main">换药规则</span>
            <span className="truncate text-[12px] text-muted">
              术后第 {settings?.dressingSchedule.earlyInterval ?? 2} 天起换药，每{" "}
              {settings?.dressingSchedule.laterInterval ?? 3} 天一次，至第{" "}
              {settings?.dressingSchedule.maxDay ?? 14} 天
            </span>
          </div>
          <ChevronDown
            size={18}
            className={`shrink-0 text-muted transition-transform ${dressingOpen ? "" : "-rotate-90"}`}
          />
        </button>
        {dressingOpen && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <NumberField
                label="前期间隔(天)"
                value={settings?.dressingSchedule.earlyInterval}
                onChange={(v) => updateSchedule({ earlyInterval: v })}
              />
              <NumberField
                label="后期间隔(天)"
                value={settings?.dressingSchedule.laterInterval}
                onChange={(v) => updateSchedule({ laterInterval: v })}
              />
              <NumberField
                label="截止(术后天数)"
                value={settings?.dressingSchedule.maxDay}
                onChange={(v) => updateSchedule({ maxDay: v })}
              />
            </div>
            <p className="text-[12px] leading-relaxed text-muted">
              换药日：术后第 {settings?.dressingSchedule.earlyInterval ?? 2} 天开始，之后每{" "}
              {settings?.dressingSchedule.laterInterval ?? 3} 天一次，至术后第{" "}
              {settings?.dressingSchedule.maxDay ?? 14} 天。例如 2 / 3 / 14 → 第 2、5、8、11、14 天。
            </p>
          </div>
        )}
      </section>
      
      <Section title="数据与维护" description="备份或恢复本机数据；应用不会把病人数据上传到云端。">
        <div className="settings-list card p-1">
          <button
            className="settings-row settings-row-grouped text-left text-[14px] text-main"
            onClick={onExport}
          >
            <Download size={18} className="text-primary" />
            <span>导出数据</span>
          </button>
          <button
            className="settings-row settings-row-grouped text-left text-[14px] text-main"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={18} className="text-primary" />
            <span>导入数据</span>
          </button>
          <button
            className="settings-row settings-row-grouped text-left text-danger"
            onClick={() => setClearOpen(true)}
          >
            <Trash2 size={18} />
            <span>清除所有数据</span>
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={onFile}
        />
      </Section>

      <Section title="关于应用" description="版本与离线更新状态。">
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
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="settings-section">
      <div className="settings-section-heading">
        <h2 className="text-[15px] font-semibold text-main">{title}</h2>
        {description && <p className="mt-0.5 text-[12px] leading-5 text-muted">{description}</p>}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function EntryLink({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: typeof Sun;
  label: string;
  description?: string;
}) {
  return (
    <Link
      href={href}
      className="settings-row settings-row-grouped text-left text-[14px] text-main transition active:scale-[0.99]"
    >
      <Icon size={18} className="text-primary" />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {description && <span className="mt-0.5 block truncate text-[12px] text-muted">{description}</span>}
      </span>
      <ArrowRight size={16} className="text-muted" />
    </Link>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-muted">{label}</span>
      <input
        type="number"
        min={1}
        className="input"
        value={value ?? ""}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isInteger(n) && n >= 1) onChange(n);
        }}
      />
    </label>
  );
}
