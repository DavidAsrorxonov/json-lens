import {
  DEFAULT_VIEWER_PREFERENCES,
  mergeViewerPreferences,
  normalizeViewerPreferences,
  type ViewerPreferences,
} from "./viewerPreferences";

export const VIEWER_PREFERENCES_STORAGE_KEY = "viewerPreferences";

function hasChromeStorage(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

function getRuntimeErrorMessage(): string | null {
  return chrome.runtime?.lastError?.message ?? null;
}

export function loadStoredViewerPreferences(): Promise<ViewerPreferences> {
  if (!hasChromeStorage()) {
    return Promise.resolve(DEFAULT_VIEWER_PREFERENCES);
  }

  return new Promise((resolve, reject) => {
    chrome.storage.local.get(VIEWER_PREFERENCES_STORAGE_KEY, (items) => {
      const runtimeErrorMessage = getRuntimeErrorMessage();

      if (runtimeErrorMessage) {
        reject(new Error(runtimeErrorMessage));
        return;
      }

      resolve(mergeViewerPreferences(items[VIEWER_PREFERENCES_STORAGE_KEY]));
    });
  });
}

export function saveStoredViewerPreferences(
  preferences: Partial<ViewerPreferences>,
): Promise<ViewerPreferences> {
  const normalizedPreferences = normalizeViewerPreferences(preferences);

  if (!hasChromeStorage()) {
    return Promise.resolve(normalizedPreferences);
  }

  return new Promise((resolve, reject) => {
    chrome.storage.local.set(
      {
        [VIEWER_PREFERENCES_STORAGE_KEY]: normalizedPreferences,
      },
      () => {
        const runtimeErrorMessage = getRuntimeErrorMessage();

        if (runtimeErrorMessage) {
          reject(new Error(runtimeErrorMessage));
          return;
        }

        resolve(normalizedPreferences);
      },
    );
  });
}

export function resetStoredViewerPreferences(): Promise<ViewerPreferences> {
  if (!hasChromeStorage()) {
    return Promise.resolve(DEFAULT_VIEWER_PREFERENCES);
  }

  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(VIEWER_PREFERENCES_STORAGE_KEY, () => {
      const runtimeErrorMessage = getRuntimeErrorMessage();

      if (runtimeErrorMessage) {
        reject(new Error(runtimeErrorMessage));
        return;
      }

      resolve(DEFAULT_VIEWER_PREFERENCES);
    });
  });
}
