import type { Transition, Variants } from "framer-motion";

// App-wide easing — a smooth ease-out curve (close to easeOutExpo)
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// Page transition (used by app/template.tsx; re-mounts on every navigation)
export const pageTransition: Transition = {
  duration: 0.4,
  ease: EASE,
};

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

// Springy press feedback for cards / buttons
export const spring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

// Bottom sheet spring — smooth, weighty settle
export const springSheet: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 34,
};

// List item enter / exit (used inside <AnimatePresence>)
export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -24 },
};

export const listItemTransition: Transition = {
  duration: 0.24,
  ease: EASE,
};
