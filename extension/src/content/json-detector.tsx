import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import {
  isJsonMimeType,
  isPlainTextMimeType,
  looksLikeJsonText,
  parseResponseBody,
  type ParseResponseResult,
} from "../shared/lib";
import { JsonTreeCore, type JsonTreeSearchMatch } from "../shared/components";
import { Braces, Code2, Copy, Search, X } from "lucide-react";

const VIEWER_ROOT_ID = "json-lens-document-viewer";
const VIEWER_STYLE_ID = "json-lens-document-viewer-styles";

type ViewerMode = "tree" | "raw";

type JsonDocumentState = {
  url: string;
  contentType: string;
  rawText: string;
  parseResult: ParseResponseResult;
};

function normalizeActiveIndex(index: number, matchCount: number): number {
  if (matchCount === 0) {
    return -1;
  }

  return ((index % matchCount) + matchCount) % matchCount;
}

function formatBytes(byteLength: number): string {
  if (byteLength < 1024) {
    return `${byteLength} B`;
  }

  if (byteLength < 1024 * 1024) {
    return `${(byteLength / 1024).toFixed(1)} KB`;
  }

  return `${(byteLength / (1024 * 1024)).toFixed(1)} MB`;
}

function shouldRenderJsonViewer(contentType: string, rawText: string): boolean {
  if (isJsonMimeType(contentType)) {
    return true;
  }

  return isPlainTextMimeType(contentType) && looksLikeJsonText(rawText);
}

function readJsonDocumentState(): JsonDocumentState | null {
  const contentType = document.contentType ?? "";
  const rawText = document.body?.textContent ?? "";

  if (!shouldRenderJsonViewer(contentType, rawText)) {
    return null;
  }

  return {
    url: window.location.href,
    contentType,
    rawText,
    parseResult: parseResponseBody(rawText),
  };
}

export function JsonDocumentViewer({
  url,
  contentType,
  rawText,
  parseResult,
}: JsonDocumentState) {
  const [viewerMode, setViewerMode] = useState<ViewerMode>("tree");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [matches, setMatches] = useState<JsonTreeSearchMatch[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(-1);
  const [copyStatus, setCopyStatus] = useState<string>("Copy raw");
  const activeMatch =
    activeMatchIndex >= 0 && activeMatchIndex < matches.length
      ? matches[activeMatchIndex]
      : null;
  const canSearch = viewerMode === "tree" && parseResult.ok;

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

  function clearSearch() {
    setSearchQuery("");
    setActiveMatchIndex(-1);
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

  function copyRawText() {
    void navigator.clipboard
      .writeText(rawText)
      .then(() => setCopyStatus("Copied"))
      .catch(() => setCopyStatus("Copy failed"));
  }

  return (
    <main className="json-lens-document">
      <header className="json-lens-toolbar">
        <div className="json-lens-title">
          <strong>JSON Lens</strong>
          <span title={url}>{url}</span>
        </div>

        <label htmlFor="json-lens-search" className="json-lens-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            placeholder="Search JSON"
            disabled={!canSearch}
            onChange={(event) => handleSearchChange(event.target.value)}
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={clearSearch}
            >
              <X size={14} />
            </button>
          )}
        </label>

        <div className="json-lens-matches" aria-label="Search matches">
          <span>
            {matches.length === 0 || activeMatchIndex < 0
              ? `0 / ${matches.length}`
              : `${activeMatchIndex + 1} / ${matches.length}`}
          </span>
          <button
            type="button"
            aria-label="Previous match"
            disabled={!canSearch || matches.length === 0}
            onClick={goToPreviousMatch}
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Next match"
            disabled={!canSearch || matches.length === 0}
            onClick={goToNextMatch}
          >
            ↓
          </button>
        </div>

        <div className="json-lens-mode">
          <button
            type="button"
            data-active={viewerMode === "tree" ? "true" : "false"}
            onClick={() => setViewerMode("tree")}
          >
            <Braces size={14} />
            Tree
          </button>
          <button
            type="button"
            data-active={viewerMode === "raw" ? "true" : "false"}
            onClick={() => setViewerMode("raw")}
          >
            <Code2 size={14} />
            Raw
          </button>
        </div>

        <button className="json-lens-copy" type="button" onClick={copyRawText}>
          <Copy size={14} />
          {copyStatus}
        </button>
      </header>

      <section className="json-lens-meta">
        <span>{contentType || "unknown content type"}</span>
        <span>{formatBytes(parseResult.byteLength)}</span>
        {activeMatch && (
          <span>
            {activeMatch.type} match at {activeMatch.path}
          </span>
        )}
        {!activeMatch && <span>No active match</span>}
      </section>

      <section className="json-lens-body">
        {viewerMode === "raw" && <pre>{rawText}</pre>}

        {viewerMode === "tree" && parseResult.ok && (
          <JsonTreeCore
            data={parseResult.data}
            rootName="response"
            defaultExpandedDepth={2}
            maxRenderedRows={300}
            previewStringLength={160}
            searchQuery={searchQuery}
            activeMatchIndex={activeMatchIndex}
            virtualizeAbove={80}
            virtualizedHeight={window.innerHeight - 92}
            virtualizedOverscan={10}
            onSearchMatchesChange={handleMatchesChange}
            onCopyPath={(path) => navigator.clipboard.writeText(path)}
            onCopyValue={(value) =>
              navigator.clipboard.writeText(JSON.stringify(value))
            }
          />
        )}

        {viewerMode === "tree" && !parseResult.ok && (
          <section className="json-lens-error" role="alert">
            <strong>{parseResult.error.message}</strong>
            <span>{parseResult.error.type}</span>
          </section>
        )}
      </section>
    </main>
  );
}

function injectViewerStyle() {
  if (document.getElementById(VIEWER_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = VIEWER_STYLE_ID;
  style.textContent = `
  html,
    body,
    #${VIEWER_ROOT_ID} {
      min-height: 100%;
      min-height: 0;
      margin: 0;
      background: #101418;
    }

    body {
      overflow: hidden;
    }

    .json-lens-document {
      display: grid;
      min-height: 100vh;
      min-height: 0;
      grid-template-rows: auto auto minmax(0, 1fr);
      background: #101418;
      color: #d6dde5;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .json-lens-toolbar {
      display: grid;
      grid-template-columns: minmax(180px, 1fr) minmax(220px, 360px) auto auto auto;
      gap: 10px;
      align-items: center;
      padding: 8px 10px;
      border-bottom: 1px solid #29313a;
      background: #151a20;
    }

    .json-lens-title {
      display: grid;
      min-width: 0;
      gap: 1px;
    }

    .json-lens-title strong {
      font-size: 13px;
      font-weight: 650;
    }

    .json-lens-title span,
    .json-lens-meta {
      color: #7d8996;
      font-size: 12px;
    }

    .json-lens-title span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .json-lens-search {
      display: flex;
      min-width: 0;
      height: 30px;
      align-items: center;
      gap: 7px;
      padding: 0 8px;
      border: 1px solid #29313a;
      border-radius: 4px;
      background: #101418;
      color: #7d8996;
    }

    .json-lens-search input {
      min-width: 0;
      flex: 1;
      border: 0;
      outline: 0;
      background: transparent;
      color: #d6dde5;
      font: inherit;
      font-size: 13px;
    }

    .json-lens-search input:disabled {
      opacity: 0.5;
    }

    .json-lens-search button,
    .json-lens-matches button,
    .json-lens-mode button,
    .json-lens-copy {
      display: inline-flex;
      height: 24px;
      align-items: center;
      justify-content: center;
      gap: 5px;
      border: 1px solid transparent;
      border-radius: 4px;
      background: transparent;
      color: #aab4c0;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
    }

    .json-lens-search button,
    .json-lens-matches button {
      width: 24px;
    }

    .json-lens-mode,
    .json-lens-matches {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .json-lens-matches span {
      min-width: 54px;
      color: #aab4c0;
      font-size: 12px;
      text-align: right;
    }

    .json-lens-mode button,
    .json-lens-copy {
      padding: 0 8px;
    }

    .json-lens-mode button[data-active="true"] {
      border-color: #3b4653;
      background: #1f2b35;
      color: #d6dde5;
    }

    .json-lens-search button:hover,
    .json-lens-matches button:hover:not(:disabled),
    .json-lens-mode button:hover,
    .json-lens-copy:hover {
      border-color: #3b4653;
      color: #d6dde5;
    }

    .json-lens-matches button:disabled {
      cursor: default;
      opacity: 0.35;
    }

    .json-lens-meta {
      display: flex;
      min-width: 0;
      min-height: 28px;
      align-items: center;
      gap: 14px;
      padding: 0 10px;
      border-bottom: 1px solid #29313a;
      background: #101418;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }

    .json-lens-meta span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .json-lens-body {
      min-width: 0;
      min-height: 0;
      overflow: hidden;
    }

    .json-lens-body pre {
      box-sizing: border-box;
  height: 100%;
  margin: 0;
  overflow: auto;
  padding: 12px;
  color: #d6dde5;
  font: 13px/1.55 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  white-space: pre;
    }

    .json-lens-error {
      display: flex;
      min-height: 220px;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 24px;
      color: #7d8996;
      text-align: center;
    }

    .json-lens-error strong {
      color: #ef8f8f;
      font-size: 14px;
      font-weight: 650;
    }

    @media (max-width: 760px) {
      .json-lens-toolbar {
        grid-template-columns: 1fr auto;
      }

      .json-lens-search {
        grid-column: 1 / -1;
        grid-row: 2;
      }

      .json-lens-matches {
        justify-self: end;
      }

      .json-lens-mode,
      .json-lens-copy {
        grid-column: span 1;
      }
    }
`;

  document.head.append(style);
}

function renderJsonViewer() {
  if (window.top !== window || document.getElementById(VIEWER_ROOT_ID)) {
    return;
  }

  const jsonDocumentState = readJsonDocumentState();

  if (!jsonDocumentState) {
    return;
  }

  injectViewerStyle();

  const rootElement = document.createElement("div");
  rootElement.id = VIEWER_ROOT_ID;

  document.body.replaceChildren(rootElement);

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <JsonDocumentViewer {...jsonDocumentState} />
    </React.StrictMode>,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderJsonViewer, {
    once: true,
  });
} else {
  renderJsonViewer();
}
