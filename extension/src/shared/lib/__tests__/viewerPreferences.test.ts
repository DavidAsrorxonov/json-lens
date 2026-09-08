import { describe, expect, it } from "vitest";
import {
  DEFAULT_VIEWER_PREFERENCES,
  mergeViewerPreferences,
  normalizeViewerPreferences,
  resetViewerPreferences,
  VIEWER_PREFERENCE_LIMITS,
} from "../viewerPreferences";

describe("viewer preferences", () => {
  it("defines production viewer defaults", () => {
    expect(DEFAULT_VIEWER_PREFERENCES).toEqual({
      defaultExpandedDepth: 2,
      previewStringLength: 160,
      maxRenderedRows: 300,
      virtualizeAbove: 80,
    });
  });

  it("normalizes and floors numeric preference values", () => {
    expect(
      normalizeViewerPreferences({
        defaultExpandedDepth: 3.9,
        previewStringLength: 250.8,
        maxRenderedRows: 999.1,
        virtualizeAbove: 100.7,
      }),
    ).toEqual({
      defaultExpandedDepth: 3,
      previewStringLength: 250,
      maxRenderedRows: 999,
      virtualizeAbove: 100,
    });
  });

  it("clamps preference values to supported limits", () => {
    expect(
      normalizeViewerPreferences({
        defaultExpandedDepth: -1,
        previewStringLength: 1,
        maxRenderedRows: 1,
        virtualizeAbove: 1,
      }),
    ).toEqual({
      defaultExpandedDepth: VIEWER_PREFERENCE_LIMITS.defaultExpandedDepth.min,
      previewStringLength: VIEWER_PREFERENCE_LIMITS.previewStringLength.min,
      maxRenderedRows: VIEWER_PREFERENCE_LIMITS.maxRenderedRows.min,
      virtualizeAbove: VIEWER_PREFERENCE_LIMITS.virtualizeAbove.min,
    });

    expect(
      normalizeViewerPreferences({
        defaultExpandedDepth: 100,
        previewStringLength: 100_000,
        maxRenderedRows: 100_000,
        virtualizeAbove: 100_000,
      }),
    ).toEqual({
      defaultExpandedDepth: VIEWER_PREFERENCE_LIMITS.defaultExpandedDepth.max,
      previewStringLength: VIEWER_PREFERENCE_LIMITS.previewStringLength.max,
      maxRenderedRows: VIEWER_PREFERENCE_LIMITS.maxRenderedRows.max,
      virtualizeAbove: VIEWER_PREFERENCE_LIMITS.virtualizeAbove.max,
    });
  });

  it("merges partial stored preferences over defaults", () => {
    expect(
      mergeViewerPreferences({
        previewStringLength: 500,
      }),
    ).toEqual({
      ...DEFAULT_VIEWER_PREFERENCES,
      previewStringLength: 500,
    });
  });

  it("ignores invalid stored preference values", () => {
    expect(
      mergeViewerPreferences({
        defaultExpandedDepth: Number.NaN,
        previewStringLength: "long",
        maxRenderedRows: null,
        virtualizeAbove: {},
      }),
    ).toEqual(DEFAULT_VIEWER_PREFERENCES);
  });

  it("falls back to defaults for missing stored preference objects", () => {
    expect(mergeViewerPreferences(undefined)).toEqual(
      DEFAULT_VIEWER_PREFERENCES,
    );
    expect(mergeViewerPreferences([])).toEqual(DEFAULT_VIEWER_PREFERENCES);
  });

  it("resets preferences to defaults", () => {
    expect(resetViewerPreferences()).toEqual(DEFAULT_VIEWER_PREFERENCES);
  });
});
