import { ChevronDown, ChevronRight, Copy, Route } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import clsx from "clsx";
import type { JsonPathSegment, JsonValue } from "../lib";
import { formatJsonPath, isJsonContainer, PAYLOAD_LIMITS } from "../lib";
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

type TreeNodeProps = {
  nodeKey: string | number | null;
  value: JsonValue;
  pathSegments: JsonPathSegment[];
  depth: number;
  defaultExpandedDepth: number;
  maxDepth: number;
  previewStringLength: number;
  searchMatchPaths: ReadonlySet<string>;
  searchAncestorPaths: ReadonlySet<string>;
  activeMatchPath: string | null;
  onCopyPath?: (path: string) => void;
  onCopyValue?: (value: JsonValue, path: string) => void;
};

function getValueType(value: JsonValue): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value;
}

function getContainerSummary(value: JsonValue): string {
  if (Array.isArray(value)) {
    return `${value.length} ${value.length === 1 ? "item" : "items"}`;
  }

  if (typeof value === "object" && value !== null) {
    const count = Object.keys(value).length;
    return `${count} ${count === 1 ? "key" : "keys"}`;
  }

  return "";
}

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
      ancestorPaths.add(formatJsonPath(match.pathSegments.slice(0, segmentCount)));
    }
  }

  return ancestorPaths;
}

function TreeNode({
  nodeKey,
  value,
  pathSegments,
  depth,
  defaultExpandedDepth,
  maxDepth,
  previewStringLength,
  searchMatchPaths,
  searchAncestorPaths,
  activeMatchPath,
  onCopyPath,
  onCopyValue,
}: TreeNodeProps) {
  const isContainer = isJsonContainer(value);
  const [isExpanded, setIsExpanded] = useState(depth < defaultExpandedDepth);
  const path = useMemo(() => formatJsonPath(pathSegments), [pathSegments]);
  const valueType = getValueType(value);
  const nodeLabel = getNodeLabel(nodeKey);

  const rowStyle = {
    "--depth": depth,
  } as CSSProperties;

  const entries = useMemo(() => getEntries(value), [value]);

  const isAtMaxDepth = isContainer && depth >= maxDepth;
  const isEmptyContainer = isContainer && entries.length === 0;
  const canToggle = isContainer && !isAtMaxDepth && !isEmptyContainer;
  const primitive = !isContainer
    ? formatPrimitive(value, previewStringLength)
    : null;
  const isSearchMatch = searchMatchPaths.has(path);
  const hasSearchMatch = searchAncestorPaths.has(path);
  const isActiveSearchMatch = activeMatchPath === path;
  const effectiveExpanded =
    canToggle && (isExpanded || hasSearchMatch);
  const toggleAction = effectiveExpanded ? "Collapse" : "Expand";

  return (
    <div className="json-tree-node" data-depth={depth} data-json-path={path}>
      <div
        className={clsx(
          "json-tree-row",
          isSearchMatch && "is-search-match",
          hasSearchMatch && "has-search-match",
          isActiveSearchMatch && "is-active-search-match",
        )}
        data-testid={`json-tree-row:${path}`}
        data-json-path={path}
        data-json-type={valueType}
        data-search-match={isSearchMatch ? "true" : undefined}
        data-has-search-match={hasSearchMatch ? "true" : undefined}
        data-active-search-match={isActiveSearchMatch ? "true" : undefined}
        style={rowStyle}
      >
        <button
          className={clsx("json-tree-toggle", !canToggle && "is-hidden")}
          type="button"
          aria-label={`${toggleAction} ${nodeLabel} at ${path}`}
          aria-expanded={canToggle ? isExpanded : undefined}
          aria-hidden={!canToggle}
          onClick={() => setIsExpanded((current) => !current)}
          disabled={!canToggle}
          tabIndex={canToggle ? undefined : -1}
        >
          {effectiveExpanded ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
        </button>

        {nodeKey !== null && (
          <>
            <span className="json-tree-key">{formatNodeKey(nodeKey)}</span>
            <span className="json-tree-colon">:</span>
          </>
        )}

        {isContainer ? (
          <>
            <button
              className="json-tree-container-label"
              type="button"
              aria-label={`Toggle ${nodeLabel} at ${path}`}
              onClick={() => setIsExpanded((current) => !current)}
              disabled={!canToggle}
            >
              <span className={clsx("json-tree-type", `is-${valueType}`)}>
                {Array.isArray(value) ? "Array" : "Object"}
              </span>
              <span className="json-tree-summary">
                {getContainerSummary(value)}
              </span>
            </button>
            {isEmptyContainer && <span className="json-tree-empty">empty</span>}
            {isAtMaxDepth && !isEmptyContainer && (
              <span className="json-tree-limit">max depth reached</span>
            )}
          </>
        ) : (
          <span className={clsx("json-tree-value", `is-${valueType}`)}>
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
            title={`Copy path ${path}`}
            aria-label={`Copy path ${path}`}
            onClick={() => onCopyPath?.(path)}
          >
            <Route size={13} />
          </button>
          <button
            className="json-tree-action"
            type="button"
            title={`Copy value ${path}`}
            aria-label={`Copy value ${path}`}
            onClick={() => onCopyValue?.(value, path)}
          >
            <Copy size={13} />
          </button>
        </div>
      </div>

      {isContainer && canToggle && effectiveExpanded && (
        <div className="json-tree-children">
          {entries.map(([childKey, childValue]) => (
            <TreeNode
              key={String(childKey)}
              nodeKey={childKey}
              value={childValue}
              pathSegments={[...pathSegments, childKey]}
              depth={depth + 1}
              defaultExpandedDepth={defaultExpandedDepth}
              maxDepth={maxDepth}
              previewStringLength={previewStringLength}
              searchMatchPaths={searchMatchPaths}
              searchAncestorPaths={searchAncestorPaths}
              activeMatchPath={activeMatchPath}
              onCopyPath={onCopyPath}
              onCopyValue={onCopyValue}
            />
          ))}
        </div>
      )}
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
  const activeMatchPath =
    activeMatchIndex >= 0 && activeMatchIndex < searchMatches.length
      ? searchMatches[activeMatchIndex].path
      : null;

  useEffect(() => {
    onSearchMatchesChange?.(searchMatches);
  }, [onSearchMatchesChange, searchMatches]);

  return (
    <section className="json-tree-core" aria-label="JSON tree">
      <TreeNode
        nodeKey={rootName}
        value={data}
        pathSegments={[]}
        depth={0}
        defaultExpandedDepth={defaultExpandedDepth}
        maxDepth={maxDepth}
        previewStringLength={previewStringLength}
        searchMatchPaths={searchMatchPaths}
        searchAncestorPaths={searchAncestorPaths}
        activeMatchPath={activeMatchPath}
        onCopyPath={onCopyPath}
        onCopyValue={onCopyValue}
      />
    </section>
  );
}
