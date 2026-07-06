import { RoundingUnit, Patient } from "@/types";
import { bedRoomLabel } from "./db";

/** Flatten rounding units into an ordered list of bed numbers. */
export function expandRoundingOrder(units: RoundingUnit[]): string[] {
  const out: string[] = [];
  for (const u of units) {
    if (u.kind === "room") out.push(...u.beds);
    else out.push(u.bed);
  }
  return out;
}

export function buildOrderMap(units: RoundingUnit[]): Map<string, number> {
  const order = expandRoundingOrder(units);
  const map = new Map<string, number>();
  order.forEach((b, i) => map.set(b, i));
  return map;
}

/** Find the room label for a bed number within the rounding units. */
export function roomOf(
  bedNumber: string,
  units: RoundingUnit[]
): string | undefined {
  for (const u of units) {
    if (u.kind === "room" && u.beds.includes(bedNumber)) {
      return bedRoomLabel(u.beds);
    }
    if (u.kind === "extra-real" && u.bed === bedNumber) return u.room;
  }
  return undefined;
}

/**
 * Sort patients per PRD §4.1.1:
 * 1) by rounding-order index; 2) appended (not in sequence) by ward + bedBase.
 */
export function sortPatients(
  patients: Patient[],
  units: RoundingUnit[]
): Patient[] {
  const map = buildOrderMap(units);
  const arr = [...patients];
  arr.sort((a, b) => {
    const ia = map.get(a.bedNumber);
    const ib = map.get(b.bedNumber);
    const inA = ia !== undefined;
    const inB = ib !== undefined;
    if (inA && inB) return ia - ib;
    if (inA) return -1;
    if (inB) return 1;
    const wa = a.ward ?? "";
    const wb = b.ward ?? "";
    if (wa !== wb) return wa.localeCompare(wb, "zh");
    return (a.bedBase ?? 0) - (b.bedBase ?? 0);
  });
  return arr;
}
