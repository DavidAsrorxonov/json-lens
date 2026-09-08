import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { useViewerPreferences } from "../shared/hooks";
import {
  VIEWER_PREFERENCE_LIMITS,
  type ViewerPreferenceKey,
  type ViewerPreferences,
} from "../shared/lib";
import "./Popup.css";

type PreferenceField = {
  key: ViewerPreferenceKey;
  label: string;
  min: number;
  max: number;
  step: number;
};

const PREFERENCE_FIELDS: PreferenceField[] = [
  {
    key: "defaultExpandedDepth",
    label: "Expanded depth",
    min: VIEWER_PREFERENCE_LIMITS.defaultExpandedDepth.min,
    max: VIEWER_PREFERENCE_LIMITS.defaultExpandedDepth.max,
    step: 1,
  },
  {
    key: "previewStringLength",
    label: "String preview",
    min: VIEWER_PREFERENCE_LIMITS.previewStringLength.min,
    max: VIEWER_PREFERENCE_LIMITS.previewStringLength.max,
    step: 20,
  },
  {
    key: "maxRenderedRows",
    label: "Rendered rows",
    min: VIEWER_PREFERENCE_LIMITS.maxRenderedRows.min,
    max: VIEWER_PREFERENCE_LIMITS.maxRenderedRows.max,
    step: 50,
  },
  {
    key: "virtualizeAbove",
    label: "Virtualize above",
    min: VIEWER_PREFERENCE_LIMITS.virtualizeAbove.min,
    max: VIEWER_PREFERENCE_LIMITS.virtualizeAbove.max,
    step: 20,
  },
];

export function Popup() {
  const {
    preferences,
    isLoaded,
    errorMessage,
    savePreferences,
    resetPreferences,
  } = useViewerPreferences();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timeoutId = setTimeout(() => setStatusMessage(null), 1800);

    return () => clearTimeout(timeoutId);
  }, [statusMessage]);

  function updatePreference(key: ViewerPreferenceKey, value: string) {
    const nextPreferences: Partial<ViewerPreferences> = {
      [key]: Number(value),
    };

    void savePreferences(nextPreferences)
      .then(() => setStatusMessage("Saved"))
      .catch(() => setStatusMessage("Save failed"));
  }

  function handleReset() {
    void resetPreferences()
      .then(() => setStatusMessage("Reset"))
      .catch(() => setStatusMessage("Reset failed"));
  }

  return (
    <main className="popup-shell">
      <header className="popup-header">
        <div>
          <strong>JSON Lens</strong>
          <span>{isLoaded ? "Viewer settings" : "Loading settings"}</span>
        </div>
        <SlidersHorizontal size={18} aria-hidden="true" />
      </header>

      <section className="popup-fields" aria-label="Viewer preferences">
        {PREFERENCE_FIELDS.map((field) => (
          <label className="popup-field" key={field.key}>
            <span>{field.label}</span>
            <input
              type="number"
              value={preferences[field.key]}
              min={field.min}
              max={field.max}
              step={field.step}
              disabled={!isLoaded}
              onChange={(event) =>
                updatePreference(field.key, event.currentTarget.value)
              }
            />
          </label>
        ))}
      </section>

      {(statusMessage || errorMessage) && (
        <section className="popup-status" role="status">
          {statusMessage ?? errorMessage}
        </section>
      )}

      <footer className="popup-footer">
        <button type="button" onClick={handleReset} disabled={!isLoaded}>
          <RotateCcw size={14} />
          Reset defaults
        </button>
      </footer>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);
