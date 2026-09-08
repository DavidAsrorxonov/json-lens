export type ViewerPreferences = {
  defaultExpandedDepth: number;
  previewStringLength: number;
  maxRenderedRows: number;
  virtualizeAbove: number;
};

export type ViewerPreferenceKey = keyof ViewerPreferences;

export const VIEWER_PREFERENCE_LIMITS = {
  defaultExpandedDepth: {
    min: 0,
    max: 10,
  },
  previewStringLength: {
    min: 20,
    max: 20_000,
  },
  maxRenderedRows: {
    min: 50,
    max: 5_000,
  },
  virtualizeAbove: {
    min: 20,
    max: 5_000,
  },
} as const satisfies Record<
  ViewerPreferenceKey,
  {
    min: number;
    max: number;
  }
>;

export const DEFAULT_VIEWER_PREFERENCES: ViewerPreferences = {
  defaultExpandedDepth: 2,
  previewStringLength: 160,
  maxRenderedRows: 300,
  virtualizeAbove: 80,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePreferenceNumber(
  value: unknown,
  fallback: number,
  limits: {
    min: number;
    max: number;
  },
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(limits.max, Math.max(limits.min, Math.floor(value)));
}

export function normalizeViewerPreferences(
  preferences: Partial<ViewerPreferences>,
): ViewerPreferences {
  return {
    defaultExpandedDepth: normalizePreferenceNumber(
      preferences.defaultExpandedDepth,
      DEFAULT_VIEWER_PREFERENCES.defaultExpandedDepth,
      VIEWER_PREFERENCE_LIMITS.defaultExpandedDepth,
    ),
    previewStringLength: normalizePreferenceNumber(
      preferences.previewStringLength,
      DEFAULT_VIEWER_PREFERENCES.previewStringLength,
      VIEWER_PREFERENCE_LIMITS.previewStringLength,
    ),
    maxRenderedRows: normalizePreferenceNumber(
      preferences.maxRenderedRows,
      DEFAULT_VIEWER_PREFERENCES.maxRenderedRows,
      VIEWER_PREFERENCE_LIMITS.maxRenderedRows,
    ),
    virtualizeAbove: normalizePreferenceNumber(
      preferences.virtualizeAbove,
      DEFAULT_VIEWER_PREFERENCES.virtualizeAbove,
      VIEWER_PREFERENCE_LIMITS.virtualizeAbove,
    ),
  };
}

export function mergeViewerPreferences(
  storedPreferences: unknown,
): ViewerPreferences {
  if (!isRecord(storedPreferences)) {
    return DEFAULT_VIEWER_PREFERENCES;
  }

  return normalizeViewerPreferences(storedPreferences);
}

export function resetViewerPreferences(): ViewerPreferences {
  return DEFAULT_VIEWER_PREFERENCES;
}
