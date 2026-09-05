import type { Patient, RoundingConfig, RoundingBlock } from "@/types";
import { isFullBed, blockLabel } from "./rounding-edit";
import { findRouteBlock, isRelativeBed, routeMatchScore, routeWard } from "./rounding-match";

export interface OrderedPatient {
  patient: Patient;
  groupId: string | null;
  groupLabel: string | null;
}
export function isFullBedNumber(bed: string): boolean { return isFullBed(bed); }

/** Relative entries are applied ward by ward; exact-only routes retain their
 * explicit cross-ward block order. Unmatched patients remain at the end. */
export function resolveOrder(config: RoundingConfig, patients: Patient[]): OrderedPatient[] {
  const blocks = config.blocks ?? [];
  const owners = new Map(patients.map(p => [p.id, findRouteBlock(p, blocks)]));
  const relative = blocks.some(block => block.beds.some(isRelativeBed));
  const placed = new Set<string>();
  const result: OrderedPatient[] = [];
  const appendBlock = (block: RoundingBlock, ward?: string) => {
    for (const bed of block.beds) {
      const matches = patients.filter(p => owners.get(p.id) === block && !placed.has(p.id) &&
        (ward === undefined || routeWard(p) === ward) && routeMatchScore(p, block, bed) > 0 &&
        !block.beds.some(other => routeMatchScore(p, block, other) > routeMatchScore(p, block, bed)))
        .sort((a, b) => a.bedNumber.localeCompare(b.bedNumber, "zh", { numeric: true }) || a.id.localeCompare(b.id));
      for (const patient of matches) {
        placed.add(patient.id);
        result.push({ patient, groupId: ward ? `${block.id}#${ward}` : block.id, groupLabel: blockLabel(block) });
      }
    }
  };
  if (relative) {
    const wards = [...new Set(patients.map(routeWard))].sort((a, b) => a.localeCompare(b, "zh", { numeric: true }));
    for (const ward of wards) for (const block of blocks) appendBlock(block, ward);
  } else {
    for (const block of blocks) appendBlock(block);
  }
  for (const patient of patients.filter(p => !placed.has(p.id)).sort((a, b) =>
    routeWard(a).localeCompare(routeWard(b), "zh", { numeric: true }) ||
    (a.bedBase ?? 0) - (b.bedBase ?? 0) ||
    a.bedNumber.localeCompare(b.bedNumber, "zh", { numeric: true }) || a.id.localeCompare(b.id))) {
    result.push({ patient, groupId: null, groupLabel: null });
  }
  return result;
}
