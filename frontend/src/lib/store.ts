import { create } from "zustand";
import type { Patient, GeneralMemo } from "@/types/patient";

export type SortMode = "rounding" | "bedNumber";
export type GroupFilter = "全部" | "解组" | "勇组";

interface AppState {
  patients: Patient[];
  memos: GeneralMemo[];
  searchQuery: string;
  groupFilter: GroupFilter;
  sortMode: SortMode;
  setPatients: (patients: Patient[]) => void;
  setMemos: (memos: GeneralMemo[]) => void;
  setSearchQuery: (q: string) => void;
  setGroupFilter: (f: GroupFilter) => void;
  setSortMode: (m: SortMode) => void;
}

export const useAppStore = create<AppState>((set) => ({
  patients: [],
  memos: [],
  searchQuery: "",
  groupFilter: "全部",
  sortMode: "rounding",
  setPatients: (patients) => set({ patients }),
  setMemos: (memos) => set({ memos }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setGroupFilter: (f) => set({ groupFilter: f }),
  setSortMode: (m) => set({ sortMode: m }),
}));
