"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { Users, ClipboardList, Settings } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { dueLabel } from "@/lib/time-parser";

const TABS = [
  { href: "/", label: "查房", icon: Users },
  { href: "/todos", label: "待办", icon: ClipboardList },
  { href: "/settings", label: "设置", icon: Settings },
];

export default function NavBar() {
  const pathname = usePathname();
  const todos = useLiveQuery(() => db.todos.toArray(), []) ?? [];

  const badge = todos.filter((t) => {
    if (t.status !== "pending" || !t.dueDate) return false;
    const lvl = dueLabel(t.dueDate).level;
    return lvl === "today" || lvl === "overdue";
  }).length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border/60 bg-card/95 backdrop-blur-xl shadow-lg safe-area-pb">
      <div className="mx-auto flex max-w-2xl grid-cols-3">
        {TABS.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/" || pathname.startsWith("/patient")
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] transition-transform active:scale-90"
            >
              <span className="relative flex h-9 w-9 items-center justify-center rounded-xl">
                {active && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-xl bg-primary/15"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <Icon
                  size={22}
                  strokeWidth={active ? 2.4 : 2}
                  className={`relative z-10 transition-colors duration-200 ${
                    active ? "text-primary" : "text-muted"
                  }`}
                />
                {tab.label === "待办" && badge > 0 && (
                  <span className="absolute -right-1 -top-1 z-20 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              <span
                className={`relative z-10 transition-colors duration-200 ${
                  active ? "font-medium text-primary" : "text-muted"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
