import React from "react";
import ReactDOM from "react-dom/client";
import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { JsonTreeCore, type JsonTreeSearchMatch } from "../shared/components";
import { useViewerPreferences } from "../shared/hooks";
import { formatBytes, normalizeActiveIndex } from "../shared/lib";
import type { CapturedJsonRequest } from "./useNetworkRequests";
import { useNetworkRequests } from "./useNetworkRequests";
import "./Panel.css";

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${Math.round(durationMs)} ms`;
  }

  return `${(durationMs / 1000).toFixed(2)} s`;
}

function formatRequestTime(startedDateTime: string): string {
  const date = new Date(startedDateTime);

  if (Number.isNaN(date.getTime())) {
    return startedDateTime;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getUrlParts(url: string): { host: string; path: string } {
  try {
    const parsedUrl = new URL(url);
    const path = `${parsedUrl.pathname}${parsedUrl.search}`;

    return {
      host: parsedUrl.host,
      path: path.length > 0 ? path : "/",
    };
  } catch {
    return {
      host: "unknown",
      path: url,
    };
  }
}

function getStatusClass(status: number): string {
  if (status >= 200 && status < 300) {
    return "is-success";
  }

  if (status >= 300 && status < 400) {
    return "is-redirect";
  }

  if (status >= 400) {
    return "is-error";
  }

  return "is-neutral";
}

function RequestListItem({
  request,
  isSelected,
  onSelect,
}: {
  request: CapturedJsonRequest;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const urlParts = getUrlParts(request.url);
  const hasIssue =
    !request.parseResult.ok || request.parseResult.warnings.length > 0;

  return (
    <button
      className="request-list-item"
      type="button"
      aria-pressed={isSelected}
      data-selected={isSelected ? "true" : "false"}
      onClick={onSelect}
    >
      <span className="request-list-primary">
        <span className="request-method">{request.method}</span>
        <span className="request-path" title={request.url}>
          {urlParts.path}
        </span>
      </span>
      <span className="request-list-secondary">
        <span className={`request-status ${getStatusClass(request.status)}`}>
          {request.status}
        </span>
        <span className="request-host">{urlParts.host}</span>
        {hasIssue && <AlertTriangle size={13} aria-label="Has warning" />}
      </span>
    </button>
  );
}

function RequestDetails({ request }: { request: CapturedJsonRequest }) {
  const warnings = request.parseResult.warnings;

  return (
    <section className="request-details" aria-label="Selected request details">
      <div>
        <span>URL</span>
        <strong title={request.url}>{request.url}</strong>
      </div>
      <div>
        <span>Method</span>
        <strong>{request.method}</strong>
      </div>
      <div>
        <span>Status</span>
        <strong>
          {request.status} {request.statusText}
        </strong>
      </div>
      <div>
        <span>Type</span>
        <strong>{request.mimeType || "unknown"}</strong>
      </div>
      <div>
        <span>Size</span>
        <strong>{formatBytes(request.byteLength)}</strong>
      </div>
      <div>
        <span>Time</span>
        <strong>{formatDuration(request.durationMs)}</strong>
      </div>
      <div>
        <span>Started</span>
        <strong>{formatRequestTime(request.startedDateTime)}</strong>
      </div>
      {request.contentEncoding && (
        <div>
          <span>Encoding</span>
          <strong>{request.contentEncoding}</strong>
        </div>
      )}
      {warnings.map((warning) => (
        <div className="request-warning" key={warning.type}>
          <span>Warning</span>
          <strong>{warning.message}</strong>
        </div>
      ))}
    </section>
  );
}

function EmptyState() {
  return (
    <section className="panel-empty" aria-label="No captured requests">
      <strong>No JSON responses captured</strong>
      <span>Reload the inspected page or trigger an API request.</span>
    </section>
  );
}

function ParseErrorState({ request }: { request: CapturedJsonRequest }) {
  if (request.parseResult.ok) {
    return null;
  }

  return (
    <section className="panel-error" role="alert">
      <strong>{request.parseResult.error.message}</strong>
      <span>
        {request.parseResult.error.type} - {formatBytes(request.byteLength)}
      </span>
      {request.parseResult.error.type === "payload-too-large" && (
        <span>
          Automatic parsing limit is{" "}
          {formatBytes(request.parseResult.error.maxAutoParseBytes)}.
        </span>
      )}
    </section>
  );
}

export function Panel() {
  const {
    captureErrors,
    requests,
    selectedRequest,
    isListening,
    clearCaptureErrors,
    clearRequests,
    selectRequest,
  } = useNetworkRequests();
  const [searchQuery, setSearchQuery] = useState("");
  const [matches, setMatches] = useState<JsonTreeSearchMatch[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
  const {
    preferences,
    errorMessage: preferencesErrorMessage,
  } = useViewerPreferences();
  const activeMatch =
    activeMatchIndex >= 0 && activeMatchIndex < matches.length
      ? matches[activeMatchIndex]
      : null;
  const effectiveSelectedRequest = selectedRequest ?? requests[0] ?? null;
  const effectiveSelectedRequestId =
    selectedRequest?.id ?? requests[0]?.id ?? null;

  function handleSearchChange(nextQuery: string) {
    setSearchQuery(nextQuery);
    setActiveMatchIndex(nextQuery.trim().length > 0 ? 0 : -1);
  }

  function handleMatchesChange(nextMatches: JsonTreeSearchMatch[]) {
    setMatches(nextMatches);
    setActiveMatchIndex((currentIndex) =>
      normalizeActiveIndex(currentIndex, nextMatches.length),
    );
  }

  function goToPreviousMatch() {
    setActiveMatchIndex((currentIndex) =>
      normalizeActiveIndex(currentIndex - 1, matches.length),
    );
  }

  function goToNextMatch() {
    setActiveMatchIndex((currentIndex) =>
      normalizeActiveIndex(currentIndex + 1, matches.length),
    );
  }

  function clearSearch() {
    setSearchQuery("");
    setActiveMatchIndex(-1);
  }

  function handleClearRequests() {
    clearRequests();
    clearSearch();
    setMatches([]);
  }

  function handleSelectRequest(request: CapturedJsonRequest) {
    selectRequest(request.id);
    setMatches([]);
    setActiveMatchIndex(
      request.parseResult.ok && searchQuery.trim().length > 0 ? 0 : -1,
    );
  }

  return (
    <main className="panel-shell">
      <header className="panel-toolbar">
        <div className="panel-title">
          <strong>JSON Lens</strong>
          <span>{isListening ? "Listening" : "Paused"}</span>
        </div>

        <label className="panel-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            placeholder="Search selected response"
            onChange={(event) => handleSearchChange(event.target.value)}
            disabled={!effectiveSelectedRequest?.parseResult.ok}
          />
          {searchQuery.length > 0 && (
            <button type="button" aria-label="Clear search" onClick={clearSearch}>
              <X size={14} />
            </button>
          )}
        </label>

        <div className="panel-match-controls" aria-label="Search matches">
          <span>
            {matches.length === 0 || activeMatchIndex < 0
              ? `0 / ${matches.length}`
              : `${activeMatchIndex + 1} / ${matches.length}`}
          </span>
          <button
            type="button"
            aria-label="Previous match"
            onClick={goToPreviousMatch}
            disabled={matches.length === 0}
          >
            <ChevronUp size={15} />
          </button>
          <button
            type="button"
            aria-label="Next match"
            onClick={goToNextMatch}
            disabled={matches.length === 0}
          >
            <ChevronDown size={15} />
          </button>
        </div>

        <button
          className="panel-clear"
          type="button"
          aria-label="Clear captured requests"
          title="Clear captured requests"
          onClick={handleClearRequests}
          disabled={requests.length === 0}
        >
          <Trash2 size={15} />
        </button>
      </header>

      <section className="panel-content">
        <aside className="request-sidebar" aria-label="Captured JSON requests">
          <div className="request-sidebar-header">
            <strong>Requests</strong>
            <span>{requests.length}</span>
          </div>
          <div className="request-list">
            {requests.map((request) => (
              <RequestListItem
                key={request.id}
                request={request}
                isSelected={request.id === effectiveSelectedRequestId}
                onSelect={() => handleSelectRequest(request)}
              />
            ))}
          </div>
        </aside>

        <section className="response-panel" aria-label="Response viewer">
          {preferencesErrorMessage && (
            <section className="capture-error-banner" role="status">
              <AlertTriangle size={14} />
              <span>Preferences: {preferencesErrorMessage}</span>
            </section>
          )}

          {captureErrors.length > 0 && (
            <section className="capture-error-banner" role="status">
              <AlertTriangle size={14} />
              <span>
                {captureErrors.length} response body read{" "}
                {captureErrors.length === 1 ? "error" : "errors"}. Latest:{" "}
                {captureErrors[0].message}
              </span>
              <button
                type="button"
                aria-label="Dismiss capture errors"
                onClick={clearCaptureErrors}
              >
                <X size={13} />
              </button>
            </section>
          )}

          {!effectiveSelectedRequest && <EmptyState />}

          {effectiveSelectedRequest && (
            <>
              <RequestDetails request={effectiveSelectedRequest} />

              <div
                className="panel-active-match"
                data-testid="panel-active-match"
              >
                {activeMatch
                  ? `${activeMatch.type} match at ${activeMatch.path}`
                  : "No active match"}
              </div>

              {effectiveSelectedRequest.parseResult.ok ? (
                <section className="panel-tree">
                  <JsonTreeCore
                    data={effectiveSelectedRequest.parseResult.data}
                    rootName="response"
                    defaultExpandedDepth={preferences.defaultExpandedDepth}
                    maxRenderedRows={preferences.maxRenderedRows}
                    previewStringLength={preferences.previewStringLength}
                    searchQuery={searchQuery}
                    activeMatchIndex={activeMatchIndex}
                    virtualizeAbove={preferences.virtualizeAbove}
                    virtualizedHeight={640}
                    virtualizedOverscan={10}
                    onSearchMatchesChange={handleMatchesChange}
                    onCopyPath={(path) => navigator.clipboard.writeText(path)}
                    onCopyValue={(value) =>
                      navigator.clipboard.writeText(JSON.stringify(value, null, 2))
                    }
                  />
                </section>
              ) : (
                <ParseErrorState request={effectiveSelectedRequest} />
              )}
            </>
          )}
        </section>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Panel />
  </React.StrictMode>,
);
