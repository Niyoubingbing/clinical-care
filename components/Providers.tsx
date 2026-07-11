"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { MotionConfig } from "framer-motion";
import { getSettings, ensureSettingsMigrated } from "@/lib/db";
import ToastContainer, { type ToastItem } from "@/components/Toast";
import UpdateBanner from "@/components/UpdateBanner";

type Theme = "light" | "dark" | "system";

interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

export type UpdateState =
  | "idle"
  | "checking"
  | "latest"
  | "available"
  | "error";

interface AppUpdate {
  state: UpdateState;
  localVersion: string | null;
  remoteVersion: string | null;
  checkForUpdate: () => void;
  applyUpdate: () => void;
}

interface AppContextValue {
  toast: (opts: ToastOptions) => void;
  update: AppUpdate;
}

const AppContext = createContext<AppContextValue>({
  toast: () => {},
  update: {
    state: "idle",
    localVersion: null,
    remoteVersion: null,
    checkForUpdate: () => {},
    applyUpdate: () => {},
  },
});

export function useApp() {
  return useContext(AppContext);
}

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    root.classList.toggle("dark", mq.matches);
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
}

export default function Providers({ children }: { children: ReactNode }) {
  const settings = useLiveQuery(() => getSettings(), []);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // 一次性迁移旧数据（roundingOrder 块模型 / quickTodos id），仅执行一次，
  // 消除 getSettings querier 内的「读里写」订阅回环（P0-3）。
  useEffect(() => {
    ensureSettingsMigrated().catch(() => {});
  }, []);

  // 应用更新状态（PWA Service Worker 更新管理）
  const [updateState, setUpdateState] = useState<UpdateState>("idle");
  const [localVersion, setLocalVersion] = useState<string | null>(null);
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const waitingRef = useRef<ServiceWorker | null>(null);
  const reloadOnActivateRef = useRef(false);
  // 检查更新后若显示「已是最新版本 / 失败」，延时自动回弹为 idle，
  // 让按钮恢复可点状态，避免卡在终态无法再次检查。
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleReset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setUpdateState((prev) =>
        prev === "latest" || prev === "error" ? "idle" : prev
      );
    }, 3500);
  }, []);

  // Apply theme
  useEffect(() => {
    if (!settings) return;
    applyThemeClass(settings.theme);
    if (settings.theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) =>
        document.documentElement.classList.toggle("dark", e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [settings]);

  // Apply theme immediately to avoid flash (before settings load, respect system)
  useEffect(() => {
    applyThemeClass("system");
  }, []);

  // Register service worker + 管理更新生命周期
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // 本地开发环境（npm run dev）默认不注册 Service Worker：
    // SW 的 fetch 为 cache-first，会缓存 dev 模式下带 hash 的 JS chunk；
    // 一旦改代码 / 重启 dev，chunk hash 变化导致旧 chunk 取不到，整个 APP 白屏无法运行。
    // 同时主动注销可能残留的旧 SW（修复已被破坏的本地环境）。
    // 但保留「离线联调开关」：localStorage 设置 'cc-dev-sw' === '1' 或 URL 含 ?sw=1
    // 时仍注册 SW，以便在本地直接验证离线行为，问题不必只在 prod 暴露。
    if (process.env.NODE_ENV !== "production") {
      const params = new URLSearchParams(window.location.search);
      const devEnabled =
        localStorage.getItem("cc-dev-sw") === "1" || params.has("sw");
      if (!devEnabled) {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => regs.forEach((r) => r.unregister()))
          .catch(() => {});
        return;
      }
    }

    // 读取本地版本（关于应用页展示 + 检查更新比对）
    fetch("/version.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && j.version && setLocalVersion(j.version))
      .catch(() => {});

    // 新版本激活（用户点击更新后 skipWaiting）时，刷新页面以加载新版本内容
    const onControllerChange = () => {
      if (reloadOnActivateRef.current) {
        reloadOnActivateRef.current = false;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let onVisible: (() => void) | null = null;
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (cancelled) return;
        registrationRef.current = reg;

        // 页面加载时若已有 waiting worker（上一次部署遗留、用户尚未更新），提示可更新
        if (reg.waiting) {
          waitingRef.current = reg.waiting;
          setUpdateState("available");
        }

        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            // 已安装且存在现有控制器（即这是一次更新而非首次安装）→ 新版本后台下载完成，等待激活
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              waitingRef.current = reg.waiting || worker;
              setUpdateState("available");
            }
          });
        });

        // 后台轮询检查新版本：仅触发浏览器下载/安装新 SW（进入 waiting），
        // 绝不自动激活——必须用户点「更新」才切换。这样已打开的标签页会主动
        // 发现新版本并弹出更新横幅，而不是靠刷新页面（刷新在 SW 未接管时可能直接加载最新版）。
        const poll = () => reg.update().catch(() => {});
        onVisible = () => {
          if (document.visibilityState === "visible") poll();
        };
        poll();
        interval = setInterval(poll, 60000);
        document.addEventListener("visibilitychange", onVisible);
      })
      .catch(() => setUpdateState("error"));

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (onVisible) document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };
  }, []);

  // 检查更新：拉取远程版本号 + 触发浏览器后台下载并安装新 SW（旧版本继续运行）
  const checkForUpdate = useCallback(() => {
    setUpdateState("checking");
    const reg = registrationRef.current;
    let fetchedRemote: string | null = null;
    fetch("/version.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && j.version) {
          fetchedRemote = j.version;
          setRemoteVersion(j.version);
        }
      })
      .catch(() => {})
      .finally(() => {
        // 触发后台下载/安装新 SW；若已有 waiting worker，updatefound 会置 available
        if (reg) reg.update().catch(() => {});
        const hasWaiting = !!(waitingRef.current || reg?.waiting);
        setUpdateState((prev) => {
          if (hasWaiting) return "available";
          if (fetchedRemote && localVersion && fetchedRemote !== localVersion)
            return "available";
          return prev === "checking" ? "latest" : prev;
        });
        // 终态（已是最新 / 失败）延时回弹，恢复按钮可点状态
        scheduleReset();
      });
  }, [localVersion, scheduleReset]);

  // 应用更新：向 waiting worker 发送 SKIP_WAITING，新 SW 激活后 controllerchange 触发刷新
  const applyUpdate = useCallback(() => {
    const reg = registrationRef.current;
    const worker = waitingRef.current || reg?.waiting || null;
    if (worker) {
      reloadOnActivateRef.current = true;
      worker.postMessage({ type: "SKIP_WAITING" });
      setUpdateState("checking");
    } else {
      // 没有 waiting worker（极端情况）：直接刷新，重新注册并拉取新 SW
      window.location.reload();
    }
  }, []);

  const updateValue: AppUpdate = {
    state: updateState,
    localVersion,
    remoteVersion,
    checkForUpdate,
    applyUpdate,
  };

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id = Date.now() + Math.random();
      const item: ToastItem = {
        id,
        message: opts.message,
        actionLabel: opts.actionLabel,
        onAction: opts.onAction,
        duration: opts.duration ?? 3000,
      };
      setToasts((prev) => [...prev, item]);
      if ((opts.duration ?? 3000) > 0) {
        setTimeout(() => removeToast(id), opts.duration ?? 3000);
      }
    },
    [removeToast]
  );

  return (
    <MotionConfig reducedMotion="user">
      <AppContext.Provider value={{ toast, update: updateValue }}>
        {children}
        <UpdateBanner />
        <ToastContainer items={toasts} onDismiss={removeToast} />
      </AppContext.Provider>
    </MotionConfig>
  );
}
