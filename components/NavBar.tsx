"use client";

import Link from "next/link";
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
    <nav className="liquid-nav fixed inset-x-4 bottom-2 z-20 mx-auto max-w-[380px] safe-area-pb transform-gpu">
      <div className="relative z-10 mx-auto flex gap-1 p-1.5">
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
              className={`group flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-2 text-[12px] transition active:scale-[0.97] ${
                active ? "liquid-nav-active" : "text-muted"
              }`}
            >
              <span className="relative flex items-center justify-center">
                <Icon
                  size={20}
                  strokeWidth={active ? 2.4 : 2}
                  className={`transition-colors duration-200 ${
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
                className={`transition-colors duration-200 ${
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
