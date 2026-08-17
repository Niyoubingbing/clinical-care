import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("solid surface CSS tokens", () => {
  it("wraps channel-based --surface values in rgb()", () => {
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

    expect(css).not.toMatch(/background:\s*var\(--surface\)/);
    expect(css.match(/background:\s*rgb\(var\(--surface\)\)/g)?.length).toBeGreaterThanOrEqual(5);
  });
});
