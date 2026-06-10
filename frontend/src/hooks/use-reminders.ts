import { useCallback } from "react";
import { db } from "@/lib/db";
import { usePatients } from "@/hooks/use-patients";
import type { Patient } from "@/types/patient";

export function useReminders() {
  const { addTodo, loadAll } = usePatients();

  const checkBloodReminders = useCallback(
    async (patient: Patient) => {
      if (!patient.lastBloodCheck) return;
      const lastDate = new Date(patient.lastBloodCheck);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      lastDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      const hasBloodTodo = patient.todos.some(
        (t) => (t.type === "开查血" || t.content.includes("查血")) && !t.completed
      );

      if (diffDays > 6 && !hasBloodTodo) {
        await addTodo(patient.id, "开查血", "开查血");
      }
    },
    [addTodo]
  );

  const checkDressingReminders = useCallback(
    async (patient: Patient) => {
      if (!patient.dressingChangeFrequency || !patient.lastDressingChange) return;
      const lastDate = new Date(patient.lastDressingChange);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      lastDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      const hasDressingTodo = patient.todos.some(
        (t) => (t.type === "换药" || t.content === "换药") && !t.completed
      );

      if (diffDays >= patient.dressingChangeFrequency && !hasDressingTodo) {
        await addTodo(patient.id, "换药", "换药");
      }
    },
    [addTodo]
  );

  const runAllReminders = useCallback(async () => {
    const patients = await db.patients.toArray();
    for (const p of patients) {
      await checkBloodReminders(p);
      await checkDressingReminders(p);
    }
    await loadAll();
  }, [checkBloodReminders, checkDressingReminders, loadAll]);

  const getBloodAlert = (patient: Patient): { level: "normal" | "warning" | "danger"; days: number } | null => {
    if (!patient.lastBloodCheck) return null;
    const lastDate = new Date(patient.lastBloodCheck);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 7) return { level: "danger", days: diffDays };
    if (diffDays > 6) return { level: "warning", days: diffDays };
    return null;
  };

  return { checkBloodReminders, checkDressingReminders, runAllReminders, getBloodAlert };
}
