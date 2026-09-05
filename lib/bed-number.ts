/** Keep original patient input for display; use this normalized value for matching. */
export function normalizeBedNumber(value: string): string {
  return value.normalize("NFKC").trim().toUpperCase().replace(/[‐‑–—−]/g, "-");
}
export function bedKey(value: string): string {
  return normalizeBedNumber(value).replace(/(\d+)(-\d+)?$/, (_, n: string, child: string | undefined) => `${Number(n)}${child ? `-${Number(child.slice(1))}` : ""}`);
}
