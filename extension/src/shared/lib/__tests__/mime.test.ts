import { describe, expect, it } from "vitest";
import {
  isJsonMimeType,
  isPlainTextMimeType,
  normalizeMimeType,
} from "../mime";

describe("mime utilities", () => {
  it("normalizes MIME types", () => {
    expect(normalizeMimeType("Application/JSON; charset=utf-8")).toBe(
      "application/json",
    );
  });

  it("detects exact JSON MIME types", () => {
    expect(isJsonMimeType("application/json")).toBe(true);
    expect(isJsonMimeType("text/json")).toBe(true);
  });

  it("detects structured +json MIME types", () => {
    expect(isJsonMimeType("application/vnd.api+json")).toBe(true);
    expect(isJsonMimeType("application/problem+json; charset=utf-8")).toBe(
      true,
    );
  });

  it("rejects non-JSON MIME types", () => {
    expect(isJsonMimeType("text/plain")).toBe(false);
    expect(isJsonMimeType("text/html")).toBe(false);
  });

  it("detects plain text MIME types", () => {
    expect(isPlainTextMimeType("text/plain; charset=utf-8")).toBe(true);
    expect(isPlainTextMimeType("application/json")).toBe(false);
  });
});
