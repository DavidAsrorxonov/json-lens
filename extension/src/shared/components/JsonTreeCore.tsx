import { ChevronDown, ChevronRight, Copy, Route } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import clsx from "clsx";
import type { JsonPathSegment, JsonValue } from "../lib";
import {
  flattenJsonTree,
  formatJsonPath,
  isJsonContainer,
  PAYLOAD_LIMITS,
  type JsonTreeRow,
} from "../lib";
import "./JsonTreeCore.css";

export type JsonTreeCoreProps = {
  data: JsonValue;
  rootName?: string;
  defaultExpandedDepth?: number;
  maxDepth?: number;
  previewStringLength?: number;
  searchQuery?: string;
  activeMatchIndex?: number;
  onSearchMatchesChange?: (matches: JsonTreeSearchMatch[]) => void;
  onCopyPath?: (path: string) => void;
  onCopyValue?: (value: JsonValue, path: string) => void;
};

export type JsonTreeSearchMatch = {
  path: string;
  type: "key" | "value" | "path";
};

type CollectedSearchMatch = JsonTreeSearchMatch & {
  pathSegments: JsonPathSegment[];
};

type TreeRowProps = {
  row: JsonTreeRow;
  isExpanded: boolean;
  isSearchMatch: boolean;
  hasSearchMatch: boolean;
  isActiveSearchMatch: boolean;
  previewStringLength: number;
  onToggle: (path: string) => void;
  onCopyPath?: (path: string) => void;
  onCopyValue?: (value: JsonValue, path: string) => void;
};

type ExpansionState = {
  data: JsonValue;
  rootName: string;
  defaultExpandedDepth: number;
  maxDepth: number;
  paths: ReadonlySet<string>;
};

function getNodeLabel(nodeKey: string | number | null): string {
  return nodeKey === null ? "root" : String(nodeKey);
}

function formatNodeKey(nodeKey: string | number): string {
  return typeof nodeKey === "number" ? String(nodeKey) : JSON.stringify(nodeKey);
}

function formatPrimitive(
  value: JsonValue,
  previewStringLength: number,
): {
  text: string;
  isTruncated: boolean;
  hiddenCharacterCount: number;
} {
  if (typeof value === "string") {
    const isTruncated = value.length > previewStringLength;
    const visibleValue = isTruncated
      ? `${value.slice(0, previewStringLength)}...`
      : value;

    return {
      text: JSON.stringify(visibleValue),
      isTruncated,
      hiddenCharacterCount: isTruncated
        ? value.length - previewStringLength
        : 0,
    };
  }

  return {
    text: String(value),
    isTruncated: false,
    hiddenCharacterCount: 0,
  };
}

function getEntries(
  value: JsonValue,
): readonly (readonly [string | number, JsonValue])[] {
  if (Array.isArray(value)) {
    return value.map((item, index) => [index, item] as const);
  }

  if (typeof value === "object" && value !== null) {
    return Object.entries(value);
  }

  return [];
}

function getPrimitiveSearchText(value: JsonValue): string {
  if (typeof value === "string") {
    return value;
  }

  if (!isJsonContainer(value)) {
    return String(value);
  }

  return "";
}

function getNodeMatchType({
  nodeKey,
  value,
  pathSegments,
  normalizedSearchQuery,
}: {
  nodeKey: string | number | null;
  value: JsonValue;
  pathSegments: JsonPathSegment[];
  normalizedSearchQuery: string;
}): JsonTreeSearchMatch["type"] | null {
  if (normalizedSearchQuery.length === 0) {
    return null;
  }

  const path = formatJsonPath(pathSegments);
  const keyText = nodeKey === null ? "" : String(nodeKey);
  const valueText = getPrimitiveSearchText(value);

  if (keyText.toLowerCase().includes(normalizedSearchQuery)) {
    return "key";
  }

  if (valueText.toLowerCase().includes(normalizedSearchQuery)) {
    return "value";
  }

  if (path.toLowerCase().includes(normalizedSearchQuery)) {
    return "path";
  }

  return null;
}

function collectSearchMatches({
  nodeKey,
  value,
  pathSegments,
  depth,
  maxDepth,
  normalizedSearchQuery,
}: {
  nodeKey: string | number | null;
  value: JsonValue;
  pathSegments: JsonPathSegment[];
  depth: number;
  maxDepth: number;
  normalizedSearchQuery: string;
}): CollectedSearchMatch[] {
  if (normalizedSearchQuery.length === 0) {
    return [];
  }

  const path = formatJsonPath(pathSegments);
  const matchType = getNodeMatchType({
    nodeKey,
    value,
    pathSegments,
    normalizedSearchQuery,
  });
  const matches: CollectedSearchMatch[] = matchType
    ? [{ path, pathSegments, type: matchType }]
    : [];

  if (!isJsonContainer(value) || depth >= maxDepth) {
    return matches;
  }

  for (const [childKey, childValue] of getEntries(value)) {
    matches.push(
      ...collectSearchMatches({
        nodeKey: childKey,
        value: childValue,
        pathSegments: [...pathSegments, childKey],
        depth: depth + 1,
        maxDepth,
        normalizedSearchQuery,
      }),
    );
  }

  return matches;
}

function collectDefaultExpandedPaths({
  value,
  pathSegments,
  depth,
  defaultExpandedDepth,
  maxDepth,
}: {
  value: JsonValue;
  pathSegments: JsonPathSegment[];
  depth: number;
  defaultExpandedDepth: number;
  maxDepth: number;
}): string[] {
  if (
    !isJsonContainer(value) ||
    depth >= defaultExpandedDepth ||
    depth >= maxDepth
  ) {
    return [];
  }

  const path = formatJsonPath(pathSegments);
  const entries = getEntries(value);

  if (entries.length === 0) {
    return [];
  }

  return [
    path,
    ...entries.flatMap(([childKey, childValue]) =>
      collectDefaultExpandedPaths({
        value: childValue,
        pathSegments: [...pathSegments, childKey],
        depth: depth + 1,
        defaultExpandedDepth,
        maxDepth,
      }),
    ),
  ];
}

function collectAncestorPaths(
  matches: readonly CollectedSearchMatch[],
): ReadonlySet<string> {
  const ancestorPaths = new Set<string>();

  for (const match of matches) {
    for (
      let segmentCount = 0;
      segmentCount < match.pathSegments.length;
      segmentCount += 1
    ) {
      ancestorPaths.add(
        formatJsonPath(match.pathSegments.slice(0, segmentCount)),
      );
    }
  }

  return ancestorPaths;
}

function TreeRow({
  row,
  isExpanded,
  isSearchMatch,
  hasSearchMatch,
  isActiveSearchMatch,
  previewStringLength,
  onToggle,
  onCopyPath,
  onCopyValue,
}: TreeRowProps) {
  const rowStyle = {
    "--depth": row.depth,
  } as CSSProperties;
  const nodeLabel = getNodeLabel(row.key);
  const canToggle =
    row.isContainer && !row.isAtMaxDepth && !row.isEmptyContainer;
  const primitive = !row.isContainer
    ? formatPrimitive(row.value, previewStringLength)
    : null;
  const effectiveExpanded = canToggle && isExpanded;
  const toggleAction = effectiveExpanded ? "Collapse" : "Expand";

  return (
    <div
      className="json-tree-node"
      data-depth={row.depth}
      data-json-path={row.path}
    >
      <div
        className={clsx(
          "json-tree-row",
          isSearchMatch && "is-search-match",
          hasSearchMatch && "has-search-match",
          isActiveSearchMatch && "is-active-search-match",
        )}
        data-testid={`json-tree-row:${row.path}`}
        data-json-path={row.path}
        data-json-type={row.type}
        data-search-match={isSearchMatch ? "true" : undefined}
        data-has-search-match={hasSearchMatch ? "true" : undefined}
        data-active-search-match={isActiveSearchMatch ? "true" : undefined}
        style={rowStyle}
      >
        <button
          className={clsx("json-tree-toggle", !canToggle && "is-hidden")}
          type="button"
          aria-label={`${toggleAction} ${nodeLabel} at ${row.path}`}
          aria-expanded={canToggle ? effectiveExpanded : undefined}
          aria-hidden={!canToggle}
          onClick={() => onToggle(row.path)}
          disabled={!canToggle}
          tabIndex={canToggle ? undefined : -1}
        >
          {effectiveExpanded ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
        </button>

        {row.key !== null && (
          <>
            <span className="json-tree-key">{formatNodeKey(row.key)}</span>
            <span className="json-tree-colon">:</span>
          </>
        )}

        {row.isContainer ? (
          <>
            <button
              className="json-tree-container-label"
              type="button"
              aria-label={`Toggle ${nodeLabel} at ${row.path}`}
              onClick={() => onToggle(row.path)}
              disabled={!canToggle}
            >
              <span className={clsx("json-tree-type", `is-${row.type}`)}>
                {row.type === "array" ? "Array" : "Object"}
              </span>
              <span className="json-tree-summary">{row.summary}</span>
            </button>
            {row.isEmptyContainer && (
              <span className="json-tree-empty">empty</span>
            )}
            {row.isAtMaxDepth && !row.isEmptyContainer && (
              <span className="json-tree-limit">max depth reached</span>
            )}
          </>
        ) : (
          <span className={clsx("json-tree-value", `is-${row.type}`)}>
            {primitive?.text}
            {primitive?.isTruncated && (
              <span className="json-tree-truncation">
                {" "}
                {primitive.hiddenCharacterCount} more characters
              </span>
            )}
          </span>
        )}

        <div className="json-tree-actions">
          <button
            className="json-tree-action"
            type="button"
            title={`Copy path ${row.path}`}
            aria-label={`Copy path ${row.path}`}
            onClick={() => onCopyPath?.(row.path)}
          >
            <Route size={13} />
          </button>
          <button
            className="json-tree-action"
            type="button"
            title={`Copy value ${row.path}`}
            aria-label={`Copy value ${row.path}`}
            onClick={() => onCopyValue?.(row.value, row.path)}
          >
            <Copy size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function JsonTreeCore({
  data,
  rootName = "root",
  defaultExpandedDepth = 1,
  maxDepth = PAYLOAD_LIMITS.maxDepth,
  previewStringLength = PAYLOAD_LIMITS.previewStringLength,
  searchQuery = "",
  activeMatchIndex = -1,
  onSearchMatchesChange,
  onCopyPath,
  onCopyValue,
}: JsonTreeCoreProps) {
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const defaultExpandedPaths = useMemo(
    () =>
      new Set(
        collectDefaultExpandedPaths({
          value: data,
          pathSegments: [],
          depth: 0,
          defaultExpandedDepth,
          maxDepth,
        }),
      ),
    [data, defaultExpandedDepth, maxDepth],
  );
  const [expandedState, setExpandedState] = useState<ExpansionState>(() => ({
    data,
    rootName,
    defaultExpandedDepth,
    maxDepth,
    paths: defaultExpandedPaths,
  }));
  const expandedPaths =
    expandedState.data === data &&
    expandedState.rootName === rootName &&
    expandedState.defaultExpandedDepth === defaultExpandedDepth &&
    expandedState.maxDepth === maxDepth
      ? expandedState.paths
      : defaultExpandedPaths;
  const collectedSearchMatches = useMemo(
    () =>
      collectSearchMatches({
        nodeKey: rootName,
        value: data,
        pathSegments: [],
        depth: 0,
        maxDepth,
        normalizedSearchQuery,
      }),
    [data, rootName, maxDepth, normalizedSearchQuery],
  );
  const searchMatches = useMemo<JsonTreeSearchMatch[]>(
    () =>
      collectedSearchMatches.map(({ path, type }) => ({
        path,
        type,
      })),
    [collectedSearchMatches],
  );
  const searchMatchPaths = useMemo(
    () => new Set(collectedSearchMatches.map((match) => match.path)),
    [collectedSearchMatches],
  );
  const searchAncestorPaths = useMemo(
    () => collectAncestorPaths(collectedSearchMatches),
    [collectedSearchMatches],
  );
  const visibleExpandedPaths = useMemo(
    () => new Set([...expandedPaths, ...searchAncestorPaths]),
    [expandedPaths, searchAncestorPaths],
  );
  const rows = useMemo(
    () =>
      flattenJsonTree({
        data,
        rootName,
        expandedPaths: visibleExpandedPaths,
        maxDepth,
      }),
    [data, rootName, visibleExpandedPaths, maxDepth],
  );
  const activeMatchPath =
    activeMatchIndex >= 0 && activeMatchIndex < searchMatches.length
      ? searchMatches[activeMatchIndex].path
      : null;

  useEffect(() => {
    onSearchMatchesChange?.(searchMatches);
  }, [onSearchMatchesChange, searchMatches]);

  function togglePath(path: string) {
    setExpandedState(() => {
      const nextPaths = new Set(expandedPaths);

      if (nextPaths.has(path)) {
        nextPaths.delete(path);
      } else {
        nextPaths.add(path);
      }

      return {
        data,
        rootName,
        defaultExpandedDepth,
        maxDepth,
        paths: nextPaths,
      };
    });
  }

  return (
    <section className="json-tree-core" aria-label="JSON tree">
      {rows.map((row) => (
        <TreeRow
          key={row.path}
          row={row}
          isExpanded={visibleExpandedPaths.has(row.path)}
          isSearchMatch={searchMatchPaths.has(row.path)}
          hasSearchMatch={searchAncestorPaths.has(row.path)}
          isActiveSearchMatch={activeMatchPath === row.path}
          previewStringLength={previewStringLength}
          onToggle={togglePath}
          onCopyPath={onCopyPath}
          onCopyValue={onCopyValue}
        />
      ))}
    </section>
  );
}
