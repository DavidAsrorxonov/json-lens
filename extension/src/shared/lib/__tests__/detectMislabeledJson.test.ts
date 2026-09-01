import { describe, expect, it } from "vitest";
import { looksLikeJsonText } from "../detectMislabeledJson";

describe("looksLikeJsonText", () => {
  it("accepts object-like JSON text", () => {
    expect(looksLikeJsonText('  { "ok": true }')).toBe(true);
  });

  it("accepts array-like JSON text", () => {
    expect(looksLikeJsonText("\n\t[1, 2, 3]")).toBe(true);
  });

  it("rejects text that does not start like JSON", () => {
    expect(looksLikeJsonText("hello")).toBe(false);
    expect(looksLikeJsonText("")).toBe(false);
    expect(looksLikeJsonText("   ")).toBe(false);
  });
});
