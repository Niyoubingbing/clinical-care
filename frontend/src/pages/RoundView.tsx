import { useState, useMemo, useCallback, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { getRoundingOrder } from "@/lib/rounding";
import PatientCard from "@/components/PatientCard";
import QuickMenu from "@/components/QuickMenu";

export default function RoundView() {
  const { patients, groupFilter, setGroupFilter } = useAppStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  const filtered = useMemo(() => {
    const list = groupFilter === "全部"
      ? [...patients]
      : patients.filter((p) => p.group === groupFilter);
    list.sort((a, b) => getRoundingOrder(a.bedNumber) - getRoundingOrder(b.bedNumber));
    return list;
  }, [patients, groupFilter]);

  // Clamp index when filtered changes
  const safeIndex = Math.min(currentIndex, Math.max(0, filtered.length - 1));
  const currentPatient = filtered[safeIndex] || null;

  const goTo = useCallback((idx: number) => {
    setCurrentIndex(Math.max(0, Math.min(idx, filtered.length - 1)));
  }, [filtered.length]);

  const goNext = useCallback(() => goTo(safeIndex + 1), [safeIndex, goTo]);
  const goPrev = useCallback(() => goTo(safeIndex - 1), [safeIndex, goTo]);

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const onTouchEnd = () => {
    if (Math.abs(touchDeltaX.current) > 60) {
      if (touchDeltaX.current > 0) goPrev();
      else goNext();
    }
    touchDeltaX.current = 0;
  };

  const groupCounts = useMemo(() => ({
    解组: patients.filter((p) => p.group === "解组").length,
    勇组: patients.filter((p) => p.group === "勇组").length,
  }), [patients]);

  // No patients at all
  if (patients.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "var(--muted)" }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
        </div>
        <div>
          <h1 style={{ fontSize: "var(--font-size-title)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)", marginBottom: "4px" }}>还没有病人</h1>
          <p style={{ fontSize: "var(--font-size-label)", color: "var(--muted-foreground)" }}>通过右上角菜单导入病人数据</p>
        </div>
        <QuickMenu />
      </div>
    );
  }

  // No patients in current group
  if (filtered.length === 0) {
    return (
      <>
        <TopBar groupFilter={groupFilter} onGroupChange={setGroupFilter} groupCounts={groupCounts} index={0} total={0} />
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <p style={{ color: "var(--muted-foreground)", fontSize: "var(--font-size-body)" }}>
            {groupFilter}目前没有病人
          </p>
        </div>
        <QuickMenu />
      </>
    );
  }

  return (
    <>
      <TopBar
        groupFilter={groupFilter}
        onGroupChange={(g) => { setGroupFilter(g); setCurrentIndex(0); }}
        groupCounts={groupCounts}
        index={safeIndex + 1}
        total={filtered.length}
      />

      <div
        className="flex-1 relative overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Navigation arrows (visible on desktop) */}
        {safeIndex > 0 && (
          <button
            onClick={goPrev}
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full items-center justify-center shadow-md active:scale-95 transition-transform"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}
        {safeIndex < filtered.length - 1 && (
          <button
            onClick={goNext}
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full items-center justify-center shadow-md active:scale-95 transition-transform"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        )}

        <PatientCard patient={currentPatient} />
      </div>

      {/* Bottom page dots */}
      <div className="flex items-center justify-center gap-1.5 py-2">
        {filtered.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="rounded-full transition-all"
            style={{
              width: i === safeIndex ? "16px" : "6px",
              height: "6px",
              backgroundColor: i === safeIndex ? "var(--primary)" : "var(--border)",
            }}
          />
        ))}
      </div>

      <QuickMenu />
    </>
  );
}

/* ── Top Bar ── */
function TopBar({
  groupFilter,
  onGroupChange,
  groupCounts,
  index,
  total,
}: {
  groupFilter: string;
  onGroupChange: (g: "全部" | "解组" | "勇组") => void;
  groupCounts: Record<string, number>;
  index: number;
  total: number;
}) {
  return (
    <div
      className="flex-shrink-0 px-4 pt-3 pb-2"
      style={{
        backgroundColor: "var(--background)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Group chips + progress */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-1.5">
          {(["全部", "解组", "勇组"] as const).map((g) => (
            <button
              key={g}
              onClick={() => onGroupChange(g)}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95"
              style={{
                backgroundColor: groupFilter === g ? "var(--primary)" : "var(--secondary)",
                color: groupFilter === g ? "var(--primary-foreground)" : "var(--secondary-foreground)",
                fontSize: "var(--font-size-small)",
              }}
            >
              {g}
              {g !== "全部" && groupCounts[g] > 0 && (
                <span className="ml-1 opacity-60">{groupCounts[g]}</span>
              )}
            </button>
          ))}
        </div>
        {total > 0 && (
          <span style={{ fontSize: "var(--font-size-small)", color: "var(--muted-foreground)", fontWeight: "var(--font-weight-medium)" }}>
            {index}/{total}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--secondary)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${(index / total) * 100}%`,
              backgroundColor: "var(--primary)",
            }}
          />
        </div>
      )}
    </div>
  );
}
