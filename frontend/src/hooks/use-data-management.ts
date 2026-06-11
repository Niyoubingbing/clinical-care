import { useCallback } from "react";
import { db } from "@/lib/db";
import { usePatients } from "@/hooks/use-patients";
import { useMemos } from "@/hooks/use-memos";
import type { Patient } from "@/types/patient";

export function useDataManagement() {
  const { loadAll: loadPatients } = usePatients();
  const { loadAll: loadMemos } = useMemos();

  const exportJSON = useCallback(async () => {
    const patients = await db.patients.toArray();
    const memos = await db.memos.toArray();
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      patients,
      memos,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clinical-care-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const importJSON = useCallback(
    async (file: File): Promise<{ success: boolean; message: string }> => {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.patients || !Array.isArray(data.patients)) {
          return { success: false, message: "无效的备份文件格式" };
        }
        await db.patients.clear();
        await db.memos.clear();
        await db.patients.bulkAdd(data.patients);
        if (data.memos && Array.isArray(data.memos)) {
          await db.memos.bulkAdd(data.memos);
        }
        await loadPatients();
        await loadMemos();
        return { success: true, message: `成功导入 ${data.patients.length} 位病人` };
      } catch {
        return { success: false, message: "导入失败，请检查文件格式" };
      }
    },
    [loadPatients, loadMemos]
  );

  const importText = useCallback(
    async (text: string): Promise<{ success: boolean; message: string; toDelete?: Patient[] }> => {
      const rawLines = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const imported: { bedNumber: string; name: string }[] = [];
      const bedPattern = /^(\d{2,4}[A-Za-z]\d{2,4})$/;

      for (const line of rawLines) {
        // Strip leading dash/bullet
        const clean = line.replace(/^[-•·\s]+/, "").trim();
        if (!clean) continue;

        let bedNumber = "";
        let name = "";

        // Try comma separated: 309W11,程霞荣 or 程霞荣,309W11
        const commaMatch = clean.match(/^(.+?)[,，](.+)$/);
        if (commaMatch) {
          const a = commaMatch[1].trim();
          const b = commaMatch[2].trim();
          if (bedPattern.test(a)) { bedNumber = a; name = b; }
          else if (bedPattern.test(b)) { bedNumber = b; name = a; }
          else { bedNumber = a; name = b; } // fallback
        } else {
          // Space/tab separated
          const parts = clean.split(/[\s\t]+/);
          if (parts.length >= 2) {
            // Check: first token looks like bed number?
            if (bedPattern.test(parts[0])) {
              bedNumber = parts[0];
              name = parts.slice(1).join("");
            } else if (bedPattern.test(parts[parts.length - 1])) {
              bedNumber = parts[parts.length - 1];
              name = parts.slice(0, -1).join("");
            } else {
              // Fallback: first = name, last = bed
              name = parts.slice(0, -1).join("");
              bedNumber = parts[parts.length - 1];
            }
          } else if (parts.length === 1) {
            // Single token - try to detect bed pattern
            if (bedPattern.test(parts[0])) {
              bedNumber = parts[0];
              name = parts[0]; // use bed as name fallback
            }
          }
        }

        if (bedNumber && name) {
          imported.push({ bedNumber, name });
        }
      }

      if (imported.length === 0) {
        return { success: false, message: "未能识别出有效的床号和姓名，请检查格式" };
      }

      const existingPatients = await db.patients.toArray();
      const existingNameMap = new Map(existingPatients.map((p) => [p.name, p]));

      const importedNames = new Set(imported.map((i) => i.name));
      const toDelete = existingPatients.filter((p) => !importedNames.has(p.name));

      for (const item of imported) {
        const existing = existingNameMap.get(item.name);
        if (existing) {
          await db.patients.update(existing.id, {
            bedNumber: item.bedNumber,
            updatedAt: new Date().toISOString(),
          });
        } else {
          await db.patients.add({
            id: crypto.randomUUID(),
            bedNumber: item.bedNumber,
            name: item.name,
            group: "解组",
            bloodRecords: [],
            todos: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      await loadPatients();

      if (toDelete.length > 0) {
        return {
          success: true,
          message: `识别到 ${imported.length} 位病人（${toDelete.length} 位将被删除）`,
          toDelete,
        };
      }

      return { success: true, message: `成功导入/更新 ${imported.length} 位病人` };
    },
    [loadPatients]
  );

  const confirmDelete = useCallback(
    async (patientIds: string[]) => {
      await db.patients.bulkDelete(patientIds);
      await loadPatients();
    },
    [loadPatients]
  );

  return { exportJSON, importJSON, importText, confirmDelete };
}
