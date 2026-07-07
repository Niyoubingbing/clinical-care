"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface ToastItem {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

export default function ToastContainer({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-main px-4 py-2.5 text-[13px] text-surface shadow-lg"
          >
            <span className="flex-1">{t.message}</span>
            {t.actionLabel && (
              <button
                className="font-semibold text-primary"
                onClick={() => {
                  t.onAction?.();
                  onDismiss(t.id);
                }}
              >
                {t.actionLabel}
              </button>
            )}
            <button
              aria-label="关闭"
              className="text-surface/60 hover:text-surface"
              onClick={() => onDismiss(t.id)}
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
