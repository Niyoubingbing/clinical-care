import { db, getSettings } from "./db";
import type { RoundingConfig, Settings } from "@/types";

/** Guard against stale route snapshots from another settings page or tab. */
export async function saveRoundingConfig(expected: RoundingConfig, next: RoundingConfig, extra?: Pick<Settings, "virtualOverrides">) {
  await db.transaction("rw", db.settings, async () => {
    const current = await getSettings();
    const exists = await db.settings.get(1);
    if (exists && JSON.stringify(current.roundingOrder) !== JSON.stringify(expected)) throw new Error("查房顺序已在其他页面更改，请重新载入后调整");
    await db.settings.put({ ...current, ...extra, roundingOrder: next, id: 1 });
  });
}
