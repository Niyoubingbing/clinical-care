import { useCallback } from "react";
import { db } from "@/lib/db";
import { getRoundingOrder } from "@/lib/rounding";
import type { SummaryEntry } from "@/types/patient";

const STORAGE_KEY = "clinical_care_daily_summary";

export function useDailySummary() {
  const generateSummary = useCallback(async (): Promise<SummaryEntry[]> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    const patients = await db.patients.toArray();
    const entries: SummaryEntry[] = [];

    for (const p of patients) {
      const completedTodos = p.todos
        .filter((t) => t.completed && t.completedAt?.startsWith(todayStr))
        .map((t) => t.content);

      const bloodChecked = p.bloodRecords.some((r) => r.date.startsWith(todayStr));
      const dressingChanged =
        p.lastDressingChange?.startsWith(todayStr) || false;

      if (completedTodos.length > 0 || bloodChecked || dressingChanged) {
        entries.push({
          bedNumber: p.bedNumber,
          name: p.name,
          completedTodos,
          bloodChecked,
          dressingChanged,
        });
      }
    }

    entries.sort((a, b) => getRoundingOrder(a.bedNumber) - getRoundingOrder(b.bedNumber));

    const summary = { date: todayStr, entries };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(summary));

    return entries;
  }, []);

  const getSavedSummary = useCallback((): { date: string; entries: SummaryEntry[] } | null => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const formatSummaryText = useCallback((entries: SummaryEntry[]): string => {
    const today = new Date().toISOString().slice(0, 10);
    const lines: string[] = [`📅 ${today} 工作小结`, ""];

    for (const e of entries) {
      lines.push(`👤 ${e.bedNumber} ${e.name}`);
      for (const todo of e.completedTodos) {
        lines.push(`✅ ${todo}`);
      }
      if (e.bloodChecked) {
        lines.push("💉 今日已查血");
      }
      lines.push("");
    }

    return lines.join("\n").trim();
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
  }, []);

  return { generateSummary, getSavedSummary, formatSummaryText, copyToClipboard };
}
