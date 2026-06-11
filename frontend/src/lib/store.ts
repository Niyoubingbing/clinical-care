import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Patient, GeneralMemo } from "@/types/patient";

export type SortMode = "rounding" | "bedNumber";
export type GroupFilter = "全部" | "解组" | "勇组";

interface AppState {
  patients: Patient[];
  memos: GeneralMemo[];
  searchQuery: string;
  groupFilter: GroupFilter;
  sortMode: SortMode;
  customQuickTodos: string[];
  setPatients: (patients: Patient[]) => void;
  setMemos: (memos: GeneralMemo[]) => void;
  setSearchQuery: (q: string) => void;
  setGroupFilter: (f: GroupFilter) => void;
  setSortMode: (m: SortMode) => void;
  addCustomQuickTodo: (label: string) => void;
  removeCustomQuickTodo: (label: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      patients: [],
      memos: [],
      searchQuery: "",
      groupFilter: "全部",
      sortMode: "rounding",
      customQuickTodos: [],
      setPatients: (patients) => set({ patients }),
      setMemos: (memos) => set({ memos }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      setGroupFilter: (f) => set({ groupFilter: f }),
      setSortMode: (m) => set({ sortMode: m }),
      addCustomQuickTodo: (label) =>
        set((s) => {
          if (s.customQuickTodos.includes(label)) return s;
          return { customQuickTodos: [...s.customQuickTodos, label] };
        }),
      removeCustomQuickTodo: (label) =>
        set((s) => ({
          customQuickTodos: s.customQuickTodos.filter((t) => t !== label),
        })),
    }),
    {
      name: "clinical-care-settings",
      partialize: (s) => ({ customQuickTodos: s.customQuickTodos }),
    }
  )
);
