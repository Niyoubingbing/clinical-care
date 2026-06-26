import { useState, useCallback } from 'react';
import { db } from '@/lib/db';
import type { BloodTest } from '@/types';

export function useBloodTest() {
  const [bloodTests, setBloodTests] = useState<BloodTest[]>([]);

  const loadByPatient = useCallback(async (patientId: string) => {
    const data = await db.bloodTests
      .where('patientId')
      .equals(patientId)
      .reverse()
      .sortBy('date');
    setBloodTests(data);
    return data;
  }, []);

  const addBloodTest = useCallback(async (
    patientId: string,
    date: string,
    items: BloodTest['items']
  ) => {
    const id = `blood_${Date.now()}`;
    await db.bloodTests.add({
      id,
      patientId,
      date,
      items,
      createdAt: new Date().toISOString(),
    });
    await loadByPatient(patientId);
  }, [loadByPatient]);

  const deleteBloodTest = useCallback(async (id: string, patientId: string) => {
    await db.bloodTests.delete(id);
    await loadByPatient(patientId);
  }, [loadByPatient]);

  return {
    bloodTests,
    loadByPatient,
    addBloodTest,
    deleteBloodTest,
  };
}
