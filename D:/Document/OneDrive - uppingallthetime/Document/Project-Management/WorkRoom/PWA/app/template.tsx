"use client";

import { motion } from "framer-motion";
import { pageVariants, pageTransition } from "@/lib/motion";

// app/template.tsx re-mounts on every navigation, so wrapping children in a
// motion.div gives every route a smooth enter animation (fade + slide-up).
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}
