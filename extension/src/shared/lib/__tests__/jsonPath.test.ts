import { describe, expect, it } from "vitest";
import { formatJsonPath } from "../jsonPath";

describe("formatJsonPath", () => {
  it("formats the root path", () => {
    expect(formatJsonPath([])).toBe("$");
  });

  it("formats object keys and array indexes", () => {
    expect(formatJsonPath(["data", "items", 0, "email"])).toBe(
      "$.data.items[0].email",
    );
  });

  it("quotes keys that are not valid identifiers", () => {
    expect(formatJsonPath(["data", "user-email"])).toBe('$.data["user-email"]');
  });

  it("escapes quoted path keys safely", () => {
    expect(formatJsonPath(["data", 'user"name'])).toBe('$.data["user\\"name"]');
  });
});
