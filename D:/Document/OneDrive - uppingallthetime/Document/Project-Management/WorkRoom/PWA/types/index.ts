export type Theme = "light" | "dark" | "system";

export type BedType = "real" | "extra-real" | "virtual";

export type TodoType =
  | "换药"
  | "查血"
  | "开术前"
  | "明天出院"
  | "康复会诊"
  | "会诊"
  | "复查"
  | "开查血"
  | "其他";

export interface Patient {
  id: string;
  bedNumber: string;
  name: string;
  diagnosis: string;
  group?: string;
  groupColor?: string;
  surgeryDate?: string;
  dressingFrequency?: number;
  lastDressingChange?: string;
  bloodTestDay?: string;
  ward?: string;
  room?: string;
  bedBase?: number;
  bedType?: BedType;
  createdAt: number;
  updatedAt: number;
}

export interface Todo {
  id: string;
  patientId?: string | null;
  content: string;
  type?: string;
  dueDate?: string;
  status: "pending" | "completed";
  completedAt?: number;
  createdAt: number;
}

export interface QuickTodo {
  label: string;
  type: string;
  content?: string;
}

export type RoundingUnit =
  | { kind: "room"; ward: string; beds: string[] }
  | { kind: "extra-real"; bed: string; room: string };

export interface Settings {
  id: number;
  roundingOrder: RoundingUnit[];
  quickTodos: QuickTodo[];
  theme: Theme;
  bedTemplate?: string;
  specialMarks?: string[];
}
