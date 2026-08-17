"use client";

import React, { useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useApp } from "@/components/Providers";

export default function UpdateBanner() {
  const { update } = useApp();
  const [dismissed, setDismissed] = useState(false);

  if (update.state !== "available" || dismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-xl ring-1 ring-border">
        <RefreshCw size={18} className="shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-main">发现新版本</p>
          <p className="truncate text-[11px] text-muted">
            {update.remoteVersion
              ? `v${update.remoteVersion} 已下载，旧版本继续运行，可稍后更新`
              : "已下载新版本，旧版本继续运行，可稍后更新"}
          </p>
        </div>
        <button
          className="btn-primary h-9 shrink-0 px-3 text-[12px]"
          onClick={() => update.applyUpdate()}
        >
          立即更新
        </button>
        <button
          className="shrink-0 rounded-md p-1 text-muted hover:bg-surface-alt"
          onClick={() => setDismissed(true)}
          aria-label="稍后更新"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
