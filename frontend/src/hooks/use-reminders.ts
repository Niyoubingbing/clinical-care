import { useState, useCallback } from 'react';
import { db } from '@/lib/db';
import type { Reminder, TodoType } from '@/types';

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const loadAll = useCallback(async () => {
    const data = await db.reminders.where('isDone').equals(0).toArray();
    setReminders(data);
  }, []);

  const getByPatient = useCallback(async (patientId: string) => {
    return await db.reminders
      .where('patientId').equals(patientId)
      .and(reminder => !reminder.isDone)
      .toArray();
  }, []);

  const addReminder = useCallback(async (patientId: string, type: TodoType, message: string, dueDate: string) => {
    const id = `reminder_${Date.now()}`;
    await db.reminders.add({
      id,
      patientId,
      type,
      message,
      dueDate,
      isDone: false,
      createdAt: new Date().toISOString(),
    });
    await loadAll();
  }, [loadAll]);

  const markDone = useCallback(async (id: string) => {
    await db.reminders.update(id, {
      isDone: true,
      doneAt: new Date().toISOString(),
    });
    await loadAll();
  }, [loadAll]);

  const runAllReminders = useCallback(async () => {
    // Check all pending reminders and show notifications
    const pending = await db.reminders.where('isDone').equals(0).toArray();
    const today = new Date().toISOString().split('T')[0];
    
    for (const reminder of pending) {
      if (reminder.dueDate <= today) {
        // Show notification or mark as done
        console.log('Reminder due:', reminder.message);
      }
    }
    
    await loadAll();
  }, [loadAll]);

  return {
    reminders,
    loadAll,
    getByPatient,
    addReminder,
    markDone,
    runAllReminders,
  };
}
