import { useState, useCallback } from 'react';
import { db } from '@/lib/db';
import type { Memo } from '@/types';

export function useMemos() {
  const [memos, setMemos] = useState<Memo[]>([]);

  const loadAll = useCallback(async () => {
    const data = await db.memos.orderBy('createdAt').reverse().toArray();
    setMemos(data);
  }, []);

  const getByPatient = useCallback(async (patientId: string) => {
    return await db.memos.where('patientId').equals(patientId).toArray();
  }, []);

  const getByDate = useCallback(async (date: string) => {
    return await db.memos.where('date').equals(date).toArray();
  }, []);

  const addMemo = useCallback(async (patientId: string, date: string, content: string) => {
    const id = `memo_${Date.now()}`;
    await db.memos.add({
      id,
      patientId,
      date,
      content,
      createdAt: new Date().toISOString(),
    });
    await loadAll();
  }, [loadAll]);

  const deleteMemo = useCallback(async (id: string) => {
    await db.memos.delete(id);
    await loadAll();
  }, [loadAll]);

  return {
    memos,
    loadAll,
    getByPatient,
    getByDate,
    addMemo,
    deleteMemo,
  };
}
