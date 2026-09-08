import { describe, expect, it } from "vitest";
import {
  getJsonDocumentState,
  getRawSearchMatches,
  shouldRenderJsonViewer,
} from "./jsonDocumentModel";

describe("json document detection", () => {
  it("detects JSON MIME documents", () => {
    expect(shouldRenderJsonViewer("application/json", "<not json>")).toBe(true);
    expect(
      shouldRenderJsonViewer("application/problem+json; charset=utf-8", ""),
    ).toBe(true);
  });

  it("detects plain-text documents that look like JSON", () => {
    expect(shouldRenderJsonViewer("text/plain", '  {"ok":true}')).toBe(true);
    expect(shouldRenderJsonViewer("text/plain", "\n[1,2,3]")).toBe(true);
  });

  it("ignores normal HTML documents", () => {
    expect(
      shouldRenderJsonViewer("text/html", "<!doctype html><html></html>"),
    ).toBe(false);
  });

  it("returns parsed state for valid JSON documents", () => {
    const documentState = getJsonDocumentState({
      url: "https://api.example.com/users",
      contentType: "application/json",
      rawText: '{"users":[{"id":1}]}',
    });

    expect(documentState).not.toBeNull();
    expect(documentState?.parseResult.ok).toBe(true);

    if (documentState?.parseResult.ok) {
      expect(documentState.parseResult.data).toEqual({
        users: [{ id: 1 }],
      });
    }
  });

  it("returns parse errors for confidently detected invalid JSON documents", () => {
    const documentState = getJsonDocumentState({
      url: "https://api.example.com/users",
      contentType: "application/json",
      rawText: "{ bad json",
    });

    expect(documentState).not.toBeNull();
    expect(documentState?.parseResult.ok).toBe(false);

    if (documentState && !documentState.parseResult.ok) {
      expect(documentState.parseResult.error.type).toBe("invalid-json");
    }
  });

  it("does not create state for ignored documents", () => {
    expect(
      getJsonDocumentState({
        url: "https://example.com",
        contentType: "text/html",
        rawText: "<html></html>",
      }),
    ).toBeNull();
  });
});

describe("raw JSON search model", () => {
  it("returns an empty list for empty search queries", () => {
    expect(getRawSearchMatches('{"name":"Ada"}', "")).toEqual([]);
    expect(getRawSearchMatches('{"name":"Ada"}', "   ")).toEqual([]);
  });

  it("finds raw search matches case-insensitively", () => {
    expect(getRawSearchMatches("Alpha beta alpha", "ALPHA")).toEqual([
      { index: 0, start: 0, end: 5 },
      { index: 1, start: 11, end: 16 },
    ]);
  });

  it("returns non-overlapping raw search matches", () => {
    expect(getRawSearchMatches("aaaa", "aa")).toEqual([
      { index: 0, start: 0, end: 2 },
      { index: 1, start: 2, end: 4 },
    ]);
  });
});
