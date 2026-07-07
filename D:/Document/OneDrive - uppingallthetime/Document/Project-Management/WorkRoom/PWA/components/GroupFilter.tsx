"use client";

export default function GroupFilter({
  groups,
  selected,
  onChange,
}: {
  groups: string[];
  selected: string | null;
  onChange: (g: string | null) => void;
}) {
  if (groups.length === 0) return null;
  return (
    <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      <button
        className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
          selected === null
            ? "bg-primary text-white"
            : "bg-card border border-border/60 text-muted"
        }`}
        onClick={() => onChange(null)}
      >
        全部
      </button>
      {groups.map((g) => (
        <button
          key={g}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
            selected === g
              ? "bg-primary text-white"
              : "bg-card border border-border/60 text-muted"
          }`}
          onClick={() => onChange(g)}
        >
          {g}
        </button>
      ))}
    </div>
  );
}
