"use client";

import { Search, X } from "lucide-react";

export default function SearchBar({
  value,
  onChange,
  placeholder = "搜索床号、姓名、诊断",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search
        size={18}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        className="input pl-10 pr-10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="搜索"
      />
      {value && (
        <button
          aria-label="清除搜索"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-main"
          onClick={() => onChange("")}
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
