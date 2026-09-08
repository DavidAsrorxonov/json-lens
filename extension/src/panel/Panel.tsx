import React from "react";
import ReactDOM from "react-dom/client";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { JsonTreeCore, type JsonTreeSearchMatch } from "../shared/components";
import type { JsonValue } from "../shared/lib";
import "./Panel.css";

function createVerificationData(): JsonValue {
  return {
    meta: {
      fixture: "JsonTreeCore browser verification",
      generatedItems: 2_000,
      targetSearches: ["needle-01999", "group-17", "owner@example.com"],
    },
    data: {
      items: Array.from({ length: 2_000 }, (_, index) => ({
        id: index,
        label: `Item ${index}`,
        group: `group-${index % 25}`,
        active: index % 3 === 0,
        owner: {
          email:
            index === 1_999
              ? "owner@example.com"
              : `owner-${index}@example.com`,
          team: `Team ${index % 8}`,
        },
        tags:
          index === 1_999
            ? ["large", "virtualized", "needle-01999"]
            : ["large", "virtualized"],
        metrics: {
          score: Number((index * 1.37).toFixed(2)),
          retries: index % 5,
        },
      })),
    },
    emptyStates: {
      emptyObject: {},
      emptyArray: [],
    },
    longString:
      "This deliberately long string verifies preview truncation while copy still keeps the complete original value. ".repeat(
        20,
      ),
  };
}

function normalizeActiveIndex(index: number, matchCount: number): number {
  if (matchCount === 0) {
    return -1;
  }

  return ((index % matchCount) + matchCount) % matchCount;
}

export function Panel() {
  const data = useMemo(() => createVerificationData(), []);
  const [searchQuery, setSearchQuery] = useState("");
  const [matches, setMatches] = useState<JsonTreeSearchMatch[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
  const activeMatch = activeMatchIndex >= 0 ? matches[activeMatchIndex] : null;

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

  return (
    <main className="panel-shell">
      <header className="panel-toolbar">
        <div className="panel-title">
          <strong>JSON Lens</strong>
          <span>Verification fixture</span>
        </div>

        <label className="panel-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            placeholder="Search keys, values, or paths"
            onChange={(event) => handleSearchChange(event.target.value)}
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
      </header>

      <div className="panel-active-match" data-testid="panel-active-match">
        {activeMatch
          ? `${activeMatch.type} match at ${activeMatch.path}`
          : "No active match"}
      </div>

      <section className="panel-tree">
        <JsonTreeCore
          data={data}
          rootName="response"
          defaultExpandedDepth={2}
          maxRenderedRows={300}
          previewStringLength={80}
          searchQuery={searchQuery}
          activeMatchIndex={activeMatchIndex}
          virtualizeAbove={80}
          virtualizedHeight={640}
          virtualizedOverscan={10}
          onSearchMatchesChange={handleMatchesChange}
          onCopyPath={(path) => navigator.clipboard.writeText(path)}
          onCopyValue={(value) =>
            navigator.clipboard.writeText(JSON.stringify(value, null, 2))
          }
        />
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Panel />
  </React.StrictMode>,
);
