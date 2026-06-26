export interface Patient {
  id: string;
  bed: string;
  name: string;
  diagnosis: string;
  admissionDate?: string;
  dischargeDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Todo {
  id: string;
  patientId: string;
  content: string;
  type: TodoType;
  dueDate?: string;
  isDone: boolean;
  doneAt?: string;
  createdAt: string;
}

export type TodoType = 
  | 'dressing'    // 换药
  | 'preop'       // 术前准备
  | 'discharge'   // 出院
  | 'rehab'       // 康复
  | 'consult'     // 会诊
  | 'review'      // 复查
  | 'blood'       // 查血
  | 'other';       // 其他

export interface Memo {
  id: string;
  patientId: string;
  date: string;
  content: string;
  createdAt: string;
}

export interface Reminder {
  id: string;
  patientId: string;
  type: TodoType;
  message: string;
  dueDate: string;
  isDone: boolean;
  doneAt?: string;
  createdAt: string;
}

export interface BloodTest {
  id: string;
  patientId: string;
  date: string;
  items: BloodTestItem[];
  createdAt: string;
}

export interface BloodTestItem {
  name: string;
  value: number;
  unit: string;
  normalRange: string;
  isAbnormal: boolean;
}
