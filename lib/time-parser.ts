export interface ParsedTime {
  date: string; // YYYY-MM-DD
  label: "今明后天" | "星期几" | "具体日期";
}

const WEEKDAY: Record<string, number> = {
  日: 0,
  天: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
};

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Parse a Chinese time expression from free text.
 * Priority: 今明后天 > 星期 > 具体日期.
 * Returns the first highest-priority match, or null.
 */
export function parseTime(text: string): ParsedTime | null {
  if (!text) return null;

  // 1) 今明后天
  const relMap: Record<string, number> = {
    今天: 0,
    今日: 0,
    明天: 1,
    明日: 1,
    后天: 2,
    后日: 2,
  };
  for (const key of ["今天", "今日", "明天", "明日", "后天", "后日"]) {
    if (text.includes(key)) {
      const d = addDays(new Date(), relMap[key]);
      return {
        date: fmt(d),
        label: "今明后天",
      };
    }
  }

  // 2) 星期 / 周 / 礼拜
  const today = new Date();
  const todayWd = today.getDay();
  const weekdayPatterns = [
    { re: /下下(星期|周|礼拜)([日天一二三四五六])/, add: 14 },
    { re: /下(星期|周|礼拜)([日天一二三四五六])/, add: 7 },
    { re: /(星期|周|礼拜)([日天一二三四五六])/, add: 0 },
  ];
  for (const { re, add } of weekdayPatterns) {
    const m = text.match(re);
    if (m) {
      const num = WEEKDAY[m[2]];
      if (num === undefined) continue;
      let base = (num - todayWd + 7) % 7;
      const days = base + add;
      const d = addDays(today, days);
      return {
        date: fmt(d),
        label: "星期几",
      };
    }
  }

  // 3) 具体日期
  const specific =
    text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/) ||
    text.match(/(\d{1,2})[-/](\d{1,2})/) ||
    text.match(/(\d{1,2})月(\d{1,2})日/);
  if (specific) {
    let y: number, mo: number, da: number;
    if (specific[0].includes("月")) {
      y = today.getFullYear();
      mo = parseInt(specific[1], 10);
      da = parseInt(specific[2], 10);
    } else if (specific[1].length === 4) {
      y = parseInt(specific[1], 10);
      mo = parseInt(specific[2], 10);
      da = parseInt(specific[3], 10);
    } else {
      y = today.getFullYear();
      mo = parseInt(specific[1], 10);
      da = parseInt(specific[2], 10);
    }
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      const d = new Date(y, mo - 1, da);
      if (!isNaN(d.getTime())) {
        return { date: fmt(d), label: "具体日期" };
      }
    }
  }

  return null;
}

export type DueLevel = "none" | "overdue" | "today" | "soon" | "future";

export interface DueInfo {
  text: string;
  level: DueLevel;
  days: number | null;
}

/** Given a dueDate string, describe remaining days / urgency. */
export function dueLabel(dueDate?: string): DueInfo {
  if (!dueDate) return { text: "无日期", level: "none", days: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dueDate + "T00:00:00");
  if (isNaN(target.getTime())) return { text: "无日期", level: "none", days: null };
  const diffMs = target.getTime() - today.getTime();
  const days = Math.round(diffMs / 86400000);
  if (days < 0) return { text: `已逾期 ${Math.abs(days)} 天`, level: "overdue", days };
  if (days === 0) return { text: "今天到期", level: "today", days };
  if (days === 1) return { text: "明天到期", level: "soon", days };
  if (days <= 3) return { text: `还剩 ${days} 天`, level: "soon", days };
  return { text: `还剩 ${days} 天`, level: "future", days };
}
