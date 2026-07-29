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
    <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
      <button
        className={`filter-chip shrink-0 px-3 py-1.5 text-[12px] font-medium transition ${
            selected === null
            ? "filter-chip-active"
            : "text-muted"
        }`}
        onClick={() => onChange(null)}
      >
        全部
      </button>
      {groups.map((g) => (
        <button
          key={g}
          className={`filter-chip shrink-0 px-3 py-1.5 text-[12px] font-medium transition ${
            selected === g
              ? "filter-chip-active"
              : "text-muted"
          }`}
          onClick={() => onChange(g)}
        >
          {g}
        </button>
      ))}
    </div>
  );
}
