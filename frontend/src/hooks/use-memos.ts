import { useCallback } from "react";
import { db } from "@/lib/db";
import { useAppStore } from "@/lib/store";
import type { GeneralMemo } from "@/types/patient";

export function useMemos() {
  const setMemos = useAppStore((s) => s.setMemos);

  const loadAll = useCallback(async () => {
    const all = await db.memos.toArray();
    setMemos(all);
  }, [setMemos]);

  const addMemo = useCallback(
    async (content: string) => {
      const memo: GeneralMemo = {
        id: crypto.randomUUID(),
        content,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      await db.memos.add(memo);
      await loadAll();
    },
    [loadAll]
  );

  const toggleMemo = useCallback(
    async (id: string) => {
      const memo = await db.memos.get(id);
      if (!memo) return;
      await db.memos.update(id, {
        completed: !memo.completed,
        completedAt: !memo.completed ? new Date().toISOString() : memo.completedAt,
      });
      await loadAll();
    },
    [loadAll]
  );

  const deleteMemo = useCallback(
    async (id: string) => {
      await db.memos.delete(id);
      await loadAll();
    },
    [loadAll]
  );

  return { loadAll, addMemo, toggleMemo, deleteMemo };
}
