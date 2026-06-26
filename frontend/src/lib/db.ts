import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Patient, Memo, Reminder } from '../types';

export class ClinicalCareDB extends Dexie {
  patients!: Table<Patient, string>;
  memos!: Table<Memo, string>;
  reminders!: Table<Reminder, string>;

  constructor() {
    super('ClinicalCareDB');
    this.version(1).stores({
      patients: 'id, bed, name, createdAt',
      memos: 'id, patientId, date, createdAt',
      reminders: 'id, patientId, type, dueDate, isDone, createdAt',
    });
  }
}

export const db = new ClinicalCareDB();
