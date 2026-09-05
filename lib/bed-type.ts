import type { BedType, RoundingBlock, RoundingConfig } from "@/types";
import { findRouteBlock, type RoutePatient } from "./rounding-match";

export type BedTypeInput = RoutePatient;
function blocksOf(config?: RoundingConfig | null): RoundingBlock[] {
  const blocks = Array.isArray(config) ? config : config?.blocks;
  return Array.isArray(blocks) ? blocks : [];
}
/** @deprecated Pre-2.18 compatibility helper for route membership. Application bed types use recognizeBed. */
export function computeBedType(p: BedTypeInput, config?: RoundingConfig | null, virtualOverrides?: readonly string[] | null): BedType {
  if (!p.bedNumber || virtualOverrides?.includes(p.bedNumber)) return "virtual";
  const block = findRouteBlock(p, blocksOf(config));
  if (!block) return "virtual";
  return block.kind === "extra" || (block.kind as string) === "extra-real" ? "extra-real" : "real";
}
export function isVirtualBed(p: BedTypeInput, config?: RoundingConfig | null, virtualOverrides?: readonly string[] | null) {
  return computeBedType(p, config, virtualOverrides) === "virtual";
}
export function isBedInRoundingOrder(p: BedTypeInput, config?: RoundingConfig | null) {
  return !!findRouteBlock(p, blocksOf(config));
}
