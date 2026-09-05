import { db, getSettings } from "./db";
import { bedKey, normalizeBedNumber } from "./bed-number";
import type { BedType } from "@/types";

/** Read-modify-write in one transaction; two tabs correcting different beds cannot overwrite each other. */
export async function setBedTypeOverride(bedNumber: string, type: Exclude<BedType, "unrecognized"> | null) {
  const bed = normalizeBedNumber(bedNumber);
  if (!bed) throw new Error("请输入床号");
  await db.transaction("rw", db.settings, async () => {
    const current = await getSettings();
    const key = bedKey(bed);
    const corrections = (current.bedTypeOverrides || []).filter(item => bedKey(item.bedNumber) !== key);
    if (type) corrections.push({ bedNumber: bed, type });
    await db.settings.put({
      ...current, bedTypeOverrides: corrections,
      virtualOverrides: (current.virtualOverrides || []).filter(value => bedKey(value) !== key),
      id: 1,
    });
  });
}
