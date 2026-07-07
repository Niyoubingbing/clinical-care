/** Return a readable text color (#fff or #1a1a1a) for a given hex background. */
export function contrastTextColor(hex?: string): string {
  if (!hex) return "#1a1a1a";
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length !== 6) return "#1a1a1a";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // relative luminance (sRGB)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#1a1a1a" : "#ffffff";
}

/** Short label for bed color block: last two digits, or first 3 chars. */
export function bedBlockLabel(bedNumber: string): string {
  const digits = bedNumber.match(/\d+/g);
  if (digits && digits.length > 0) {
    const last = digits[digits.length - 1];
    return last.length >= 2 ? last.slice(-2) : last;
  }
  return bedNumber.slice(0, 3);
}
