"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { springSheet } from "@/lib/motion";

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="liquid-sheet fixed inset-x-2 bottom-2 z-50 mx-auto flex max-h-[85vh] w-[calc(100%-1rem)] max-w-2xl flex-col rounded-[30px]"
            initial={{ y: "100%", scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: "100%", scale: 0.96 }}
            transition={springSheet}
          >
            <div className="flex items-center justify-between px-5 pt-3">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-[#cbd5e1]" />
            </div>
            {title && (
              <div className="flex items-center justify-between px-5 pb-2 pt-2">
                <h2 className="text-[16px] font-semibold text-main">{title}</h2>
                <button
                  aria-label="关闭"
                  onClick={onClose}
                  className="text-muted hover:text-main"
                >
                  <X size={20} />
                </button>
              </div>
            )}
            <div className="scrollbar-hide flex-1 overflow-y-auto p-5 pt-2">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
