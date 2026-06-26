import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import type { Patient } from '@/types';

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.patients.orderBy('bed').toArray();
      setPatients(data);
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addPatient = useCallback(async (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const id = `patient_${Date.now()}`;
    await db.patients.add({
      ...patient,
      id,
      createdAt: now,
      updatedAt: now,
    });
    await loadPatients();
  }, [loadPatients]);

  const updatePatient = useCallback(async (id: string, updates: Partial<Patient>) => {
    await db.patients.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await loadPatients();
  }, [loadPatients]);

  const deletePatient = useCallback(async (id: string) => {
    await db.patients.delete(id);
    await db.memos.where('patientId').equals(id).delete();
    await db.reminders.where('patientId').equals(id).delete();
    await loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  return {
    patients,
    loading,
    loadPatients,
    addPatient,
    updatePatient,
    deletePatient,
  };
}
