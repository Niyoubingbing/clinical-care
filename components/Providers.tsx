"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/db";
import ToastContainer, { type ToastItem } from "@/components/Toast";

type Theme = "light" | "dark" | "system";

interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface AppContextValue {
  toast: (opts: ToastOptions) => void;
}

const AppContext = createContext<AppContextValue>({ toast: () => {} });

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

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* SW failure is non-fatal */
      });
    }
  }, []);

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
    <AppContext.Provider value={{ toast }}>
      {children}
      <ToastContainer items={toasts} onDismiss={removeToast} />
    </AppContext.Provider>
  );
}
