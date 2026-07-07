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

export type RoundingBlock =
  | { id: string; kind: "room"; ward?: string; beds: string[] }
  | { id: string; kind: "extra"; beds: string[] };

export interface RoundingConfig {
  ruleType: "default" | "basic" | "custom"; // 当前规则态；修改内置规则后自动置 'custom'
  direction?: "forward" | "reverse"; // 序列方向，默认 'forward'；reverse 为整体反转
  regularBedCount?: number; // 基础规则：普通病床总数（不含加床/虚拟）
  avgBedsPerRoom?: number; // 基础规则：平均单一病房床数
  blocks: RoundingBlock[]; // 有序序列：病房块 + 真实加床块
}

export interface Settings {
  id: number;
  roundingOrder: RoundingConfig; // 查房顺序配置（块模型，见 PRD 4.9.4）
  quickTodos: QuickTodo[];
  theme: Theme;
  bedTemplate?: string;
  specialMarks?: string[];
}
