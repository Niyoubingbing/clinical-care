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
  specialType?: string; // 特殊床标记字母（如 "J" / "YZ"），由床号解析得到并持久化，用于列表/详情快速标识特殊类型床
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
  id: string;
  label: string;
  type: string;
  content?: string;
}

export interface CustomGroup {
  id: string;
  name: string;
  color: string;
}

export type RoundingBlock =
  | { id: string; kind: "room"; ward?: string; beds: string[] }
  | { id: string; kind: "extra"; beds: string[] };

export interface RoundingConfig {
  ruleType: "default" | "basic" | "custom"; // 当前规则态；修改内置规则后自动置 'custom'
  regularBedCount?: number; // 基础规则：普通病床总数（不含加床/虚拟）
  avgBedsPerRoom?: number; // 基础规则：平均单一病房床数
  blocks: RoundingBlock[]; // 有序序列：病房块 + 真实加床块（顺序本身即查房顺序）
}

export interface Settings {
  id: number;
  roundingOrder: RoundingConfig; // 查房顺序配置（块模型，见 PRD 4.9.4）
  listDirection?: "forward" | "reverse"; // 首页病人列表展示方向（与查房顺序设置解耦），默认 'forward'
  quickTodos: QuickTodo[];
  customGroups?: CustomGroup[]; // 自定义分组（设置页维护，详情页快捷切换）
  theme: Theme;
  bedTemplate?: string;
  specialMarks?: string[];
}
