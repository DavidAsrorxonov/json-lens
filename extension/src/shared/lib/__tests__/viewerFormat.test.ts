import { describe, expect, it } from "vitest";
import { formatBytes, normalizeActiveIndex } from "../viewerFormat";

describe("normalizeActiveIndex", () => {
  it("wraps indexes within the match count", () => {
    expect(normalizeActiveIndex(0, 3)).toBe(0);
    expect(normalizeActiveIndex(3, 3)).toBe(0);
    expect(normalizeActiveIndex(-1, 3)).toBe(2);
  });

  it("returns -1 when there are no matches", () => {
    expect(normalizeActiveIndex(0, 0)).toBe(-1);
    expect(normalizeActiveIndex(-1, 0)).toBe(-1);
  });
});

describe("formatBytes", () => {
  it("formats byte, kilobyte, and megabyte sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});
