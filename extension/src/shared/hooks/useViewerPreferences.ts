import { useEffect, useState } from "react";
import {
  DEFAULT_VIEWER_PREFERENCES,
  loadStoredViewerPreferences,
  normalizeViewerPreferences,
  resetStoredViewerPreferences,
  saveStoredViewerPreferences,
  type ViewerPreferences,
} from "../lib";

export type ViewerPreferencesState = {
  preferences: ViewerPreferences;
  isLoaded: boolean;
  errorMessage: string | null;
  savePreferences: (
    preferences: Partial<ViewerPreferences>,
  ) => Promise<ViewerPreferences>;
  resetPreferences: () => Promise<ViewerPreferences>;
};

export function useViewerPreferences(): ViewerPreferencesState {
  const [preferences, setPreferences] = useState<ViewerPreferences>(
    DEFAULT_VIEWER_PREFERENCES,
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    loadStoredViewerPreferences()
      .then((storedPreferences) => {
        if (!isActive) {
          return;
        }

        setPreferences(storedPreferences);
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load viewer preferences.",
        );
      })
      .finally(() => {
        if (!isActive) {
          return;
        }

        setIsLoaded(true);
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function savePreferences(nextPreferences: Partial<ViewerPreferences>) {
    const normalizedPreferences = normalizeViewerPreferences({
      ...preferences,
      ...nextPreferences,
    });

    setPreferences(normalizedPreferences);

    try {
      const savedPreferences =
        await saveStoredViewerPreferences(normalizedPreferences);
      setErrorMessage(null);
      setPreferences(savedPreferences);

      return savedPreferences;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save viewer preferences.",
      );
      throw error;
    }
  }

  async function resetPreferences() {
    try {
      const resetPreferencesResult = await resetStoredViewerPreferences();
      setErrorMessage(null);
      setPreferences(resetPreferencesResult);

      return resetPreferencesResult;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to reset viewer preferences.",
      );
      throw error;
    }
  }

  return {
    preferences,
    isLoaded,
    errorMessage,
    savePreferences,
    resetPreferences,
  };
}
