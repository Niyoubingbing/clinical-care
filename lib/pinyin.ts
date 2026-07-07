import { pinyin } from "pinyin-pro";
import { Patient } from "@/types";

/** Get pinyin first-letter initials of Chinese text, lowercased. */
export function pinyinInitials(text: string): string {
  if (!text) return "";
  try {
    return pinyin(text, {
      pattern: "first",
      toneType: "none",
      type: "string",
    })
      .replace(/\s/g, "")
      .toLowerCase();
  } catch {
    return "";
  }
}

export function matchText(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const h = haystack.toLowerCase();
  if (h.includes(q)) return true;
  return pinyinInitials(haystack).includes(q);
}

export function matchPatient(p: Patient, query: string): boolean {
  if (!query.trim()) return true;
  return (
    matchText(p.bedNumber, query) ||
    matchText(p.name, query) ||
    matchText(p.diagnosis, query)
  );
}
