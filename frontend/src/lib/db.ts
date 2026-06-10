import Dexie, { type EntityTable } from "dexie";
import type { Patient, GeneralMemo } from "@/types/patient";

const db = new Dexie("ClinicalCareDB") as Dexie & {
  patients: EntityTable<Patient, "id">;
  memos: EntityTable<GeneralMemo, "id">;
};

db.version(1).stores({
  patients: "id, bedNumber, name, group",
  memos: "id, completed, createdAt",
});

export type { Patient, GeneralMemo };
export { db };
