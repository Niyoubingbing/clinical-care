import { useCallback } from "react";
import { db } from "@/lib/db";
import { useAppStore } from "@/lib/store";
import type { Patient, BloodRecord, Todo, MedicalGroup } from "@/types/patient";

export function usePatients() {
  const setPatients = useAppStore((s) => s.setPatients);

  const loadAll = useCallback(async () => {
    const all = await db.patients.toArray();
    setPatients(all);
  }, [setPatients]);

  const addPatient = useCallback(
    async (data: { bedNumber: string; name: string; group: MedicalGroup }) => {
      const now = new Date().toISOString();
      const patient: Patient = {
        id: crypto.randomUUID(),
        bedNumber: data.bedNumber,
        name: data.name,
        group: data.group,
        bloodRecords: [],
        todos: [],
        createdAt: now,
        updatedAt: now,
      };
      await db.patients.add(patient);
      await loadAll();
      return patient;
    },
    [loadAll]
  );

  const updatePatient = useCallback(
    async (id: string, updates: Partial<Patient>) => {
      await db.patients.update(id, { ...updates, updatedAt: new Date().toISOString() });
      await loadAll();
    },
    [loadAll]
  );

  const deletePatient = useCallback(
    async (id: string) => {
      await db.patients.delete(id);
      await loadAll();
    },
    [loadAll]
  );

  const restorePatient = useCallback(
    async (patient: Patient) => {
      await db.patients.add(patient);
      await loadAll();
    },
    [loadAll]
  );

  const addBloodRecord = useCallback(
    async (patientId: string, record: Omit<BloodRecord, "id">) => {
      const patient = await db.patients.get(patientId);
      if (!patient) return;
      const newRecord: BloodRecord = { ...record, id: crypto.randomUUID() };
      await db.patients.update(patientId, {
        bloodRecords: [...patient.bloodRecords, newRecord],
        lastBloodCheck: record.date,
        updatedAt: new Date().toISOString(),
      });
      await loadAll();
    },
    [loadAll]
  );

  const deleteBloodRecord = useCallback(
    async (patientId: string, recordId: string) => {
      const patient = await db.patients.get(patientId);
      if (!patient) return;
      await db.patients.update(patientId, {
        bloodRecords: patient.bloodRecords.filter((r) => r.id !== recordId),
        updatedAt: new Date().toISOString(),
      });
      await loadAll();
    },
    [loadAll]
  );

  const addTodo = useCallback(
    async (patientId: string, content: string, type?: Todo["type"]) => {
      const patient = await db.patients.get(patientId);
      if (!patient) return;
      const todo: Todo = {
        id: crypto.randomUUID(),
        patientId,
        content,
        completed: false,
        createdAt: new Date().toISOString(),
        type,
      };
      await db.patients.update(patientId, {
        todos: [...patient.todos, todo],
        updatedAt: new Date().toISOString(),
      });
      await loadAll();
    },
    [loadAll]
  );

  const toggleTodo = useCallback(
    async (patientId: string, todoId: string) => {
      const patient = await db.patients.get(patientId);
      if (!patient) return;
      const todos = patient.todos.map((t) =>
        t.id === todoId
          ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : t.completedAt }
          : t
      );
      await db.patients.update(patientId, { todos, updatedAt: new Date().toISOString() });
      await loadAll();
    },
    [loadAll]
  );

  const deleteTodo = useCallback(
    async (patientId: string, todoId: string) => {
      const patient = await db.patients.get(patientId);
      if (!patient) return;
      await db.patients.update(patientId, {
        todos: patient.todos.filter((t) => t.id !== todoId),
        updatedAt: new Date().toISOString(),
      });
      await loadAll();
    },
    [loadAll]
  );

  return {
    loadAll,
    addPatient,
    updatePatient,
    deletePatient,
    restorePatient,
    addBloodRecord,
    deleteBloodRecord,
    addTodo,
    toggleTodo,
    deleteTodo,
  };
}
