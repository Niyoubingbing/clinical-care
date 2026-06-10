import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, ClipboardList, FileText, Database } from "lucide-react";

const tabs = [
  { path: "/", label: "病人", icon: Users },
  { path: "/todos", label: "待办", icon: ClipboardList },
  { path: "/summary", label: "小结", icon: FileText },
  { path: "/data", label: "数据", icon: Database },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const getActive = () => {
    if (location.pathname === "/") return "/";
    for (const tab of tabs) {
      if (tab.path !== "/" && location.pathname.startsWith(tab.path)) return tab.path;
    }
    return "/";
  };

  const active = getActive();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t flex justify-around items-center safe-area-bottom"
      style={{ borderColor: "var(--border)", height: "calc(var(--spacing-xl) * 2 + env(safe-area-inset-bottom, 0px))", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-h-[48px]"
            style={{ color: isActive ? "var(--primary)" : "var(--muted-foreground)" }}
          >
            {isActive && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -top-0.5 h-0.5 w-8 rounded-full"
                style={{ backgroundColor: "var(--primary)" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <tab.icon size={20} />
            <span style={{ fontSize: "var(--font-size-small)" }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
