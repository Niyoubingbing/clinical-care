import { bedKey, normalizeBedNumber } from "./bed-number";
import { parseBed } from "./bed-parser";
import type { RoundingBlock } from "@/types";

export interface RoutePatient { bedNumber?: string | null; ward?: string | null; bedBase?: number | null }
export function routeWard(p: RoutePatient) { return normalizeBedNumber(p.ward || parseBed(p.bedNumber || "").ward); }
export function isRelativeBed(bed: string) { bed = normalizeBedNumber(bed); return /^\d+(?:-\d+)?$/.test(bed) || /^[A-Z]{1,2}\d{1,3}(?:-\d+)?$/.test(bed); }

/** Exact assignments override ward-relative templates, so moving one bed is effective. */
export function routeMatchScore(p: RoutePatient, block: RoundingBlock, bed: string): number {
  if (!p.bedNumber || !bed) return 0;
  bed = normalizeBedNumber(bed);
  const full = normalizeBedNumber(p.bedNumber);
  const ward = routeWard(p);
  if (block.kind === "room" && block.ward && normalizeBedNumber(block.ward) !== ward) return 0;
  const extra = (block.kind as string) === "extra" || (block.kind as string) === "extra-real";
  if (!isRelativeBed(bed)) return bedKey(full) === bedKey(bed) ? 3 : 0;
  const suffix = ward && full.startsWith(ward) ? full.slice(ward.length) : full;
  if (/^[A-Z]/.test(bed)) {
    // J04 and YZ04 retain their mark; never compare them only by the number 4.
    return extra && bedKey(suffix) === bedKey(bed) ? 2 : 0;
  }
  if (bed.includes("-")) return !extra && bedKey(suffix) === bedKey(bed) ? 2 : 0;
  const parts = suffix.match(/^([A-Z]{0,2})(\d+)(?:-\d+)?$/);
  return parts && Boolean(parts[1]) === extra && Number(parts[2]) === Number(bed) ? 1 : 0;
}

export function findRouteBlock(p: RoutePatient, blocks: readonly RoundingBlock[]) {
  let score = 0;
  let found: RoundingBlock | undefined;
  for (const block of blocks) {
    if (!block || !Array.isArray(block.beds)) continue;
    for (const bed of block.beds) {
      const next = routeMatchScore(p, block, bed);
      if (next > score) { score = next; found = block; }
    }
  }
  return found;
}
