export type MedicalGroup = "解组" | "勇组";

export interface BloodRecord {
  id: string;
  date: string;
  hb?: number;
  wbc?: number;
  plt?: number;
  k?: number;
  na?: number;
  cr?: number;
  alb?: number;
  crp?: number;
}

export interface Todo {
  id: string;
  patientId: string;
  content: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  type?: "换药" | "开术前" | "明天出院" | "康复会诊" | "会诊" | "复查" | "开查血" | "其他";
}

export interface GeneralMemo {
  id: string;
  content: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface Patient {
  id: string;
  bedNumber: string;
  name: string;
  group: MedicalGroup;
  surgeryDate?: string;
  bloodRecords: BloodRecord[];
  todos: Todo[];
  dressingChangeFrequency?: number; // 天
  lastDressingChange?: string;
  lastBloodCheck?: string;
  bloodCheckDay?: number; // 周几 0-6
  createdAt: string;
  updatedAt: string;
}

export interface DailySummary {
  date: string;
  entries: SummaryEntry[];
}

export interface SummaryEntry {
  bedNumber: string;
  name: string;
  completedTodos: string[];
  bloodChecked: boolean;
  dressingChanged: boolean;
}
