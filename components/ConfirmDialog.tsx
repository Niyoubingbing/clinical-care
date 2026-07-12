"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "确认",
  cancelText = "取消",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="liquid-dialog w-full max-w-sm rounded-[26px] p-5"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-[16px] font-semibold text-main">{title}</h3>
              {message && (
                <div className="mt-2 text-[13px] text-muted">{message}</div>
              )}
              <div className="mt-5 flex gap-3">
                <button
                  className="btn-secondary flex-1 h-11"
                  onClick={onCancel}
                >
                  {cancelText}
                </button>
                <button
                  className={`flex-1 h-11 rounded-xl font-medium text-white transition active:scale-[0.97] ${
                    danger ? "bg-danger" : "bg-primary"
                  }`}
                  onClick={onConfirm}
                >
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
