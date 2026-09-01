import { describe, expect, it } from "vitest";
import { parseResponseBody } from "../parseResponse";
import { PAYLOAD_LIMITS } from "../payloadLimits";

describe("parseResponseBody", () => {
  it("parses JSON objects", () => {
    const result = parseResponseBody('{"data":{"items":[{"id":1}]}}');

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.data).toEqual({ data: { items: [{ id: 1 }] } });
      expect(result.warnings).toEqual([]);
    }
  });

  it("parses JSON arrays", () => {
    const result = parseResponseBody('[{"id":1},{"id":2}]');

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    }
  });

  it("allows top-level primitives but warns", () => {
    const result = parseResponseBody('"hello"');

    expect(result.ok).toBe(true);
    expect(result.warnings).toContainEqual({
      type: "top-level-primitive",
      message: "Top-level JSON value is a primitive.",
    });
  });

  it("rejects empty bodies", () => {
    const result = parseResponseBody("   ");

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.type).toBe("empty-body");
    }
  });

  it("rejects invalid JSON", () => {
    const result = parseResponseBody("{ bad json");

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.type).toBe("invalid-json");
    }
  });

  it("warns for large payloads above the warning threshold", () => {
    const largeText = JSON.stringify({
      value: "x".repeat(PAYLOAD_LIMITS.warnParseBytes + 1),
    });

    const result = parseResponseBody(largeText);

    expect(result.ok).toBe(true);
    expect(
      result.warnings.some((warning) => warning.type === "large-payload"),
    ).toBe(true);
  });

  it("rejects payloads above the automatic parse limit", () => {
    const tooLargeText = JSON.stringify({
      value: "x".repeat(PAYLOAD_LIMITS.maxAutoParseBytes + 1),
    });

    const result = parseResponseBody(tooLargeText);

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.type).toBe("payload-too-large");
    }
  });
});
