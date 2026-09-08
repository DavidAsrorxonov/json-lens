import { Check, ChevronDown, ChevronRight, Copy, Route } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
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
  maxRenderedRows?: number;
  maxDepth?: number;
  previewStringLength?: number;
  searchQuery?: string;
  activeMatchIndex?: number;
  virtualizeAbove?: number;
  virtualizedHeight?: number;
  virtualizedOverscan?: number;
  onLoadFullTree?: (rowCount: number) => void;
  onSearchMatchesChange?: (matches: JsonTreeSearchMatch[]) => void;
  onCopyPath?: (path: string) => void | Promise<void>;
  onCopyValue?: (value: JsonValue, path: string) => void | Promise<void>;
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
  onCopyPath?: (path: string) => void | Promise<void>;
  onCopyValue?: (value: JsonValue, path: string) => void | Promise<void>;
};

type ExpansionState = {
  data: JsonValue;
  rootName: string;
  defaultExpandedDepth: number;
  maxDepth: number;
  paths: ReadonlySet<string>;
};

type RenderLimitState = {
  data: JsonValue;
  rootName: string;
  maxRenderedRows: number;
  isFullTreeLoaded: boolean;
};

type RenderedVirtualRow = {
  key: string | number | bigint;
  index: number;
  start: number;
};

type CopyFeedback = {
  type: "path" | "value";
  status: "success" | "error";
} | null;

const ESTIMATED_ROW_HEIGHT = 26;
const COPY_FEEDBACK_DURATION_MS = 1800;

function getNodeLabel(nodeKey: string | number | null): string {
  return nodeKey === null ? "root" : String(nodeKey);
}

function formatNodeKey(nodeKey: string | number): string {
  return typeof nodeKey === "number"
    ? String(nodeKey)
    : JSON.stringify(nodeKey);
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
    const normalizedPreviewLength = Math.max(
      1,
      Math.floor(previewStringLength),
    );
    const isTruncated = value.length > normalizedPreviewLength;
    const visibleValue = isTruncated
      ? `${value.slice(0, normalizedPreviewLength)}...`
      : value;

    return {
      text: JSON.stringify(visibleValue),
      isTruncated,
      hiddenCharacterCount: isTruncated
        ? value.length - normalizedPreviewLength
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

function getInitialVirtualRows({
  count,
  height,
  overscan,
}: {
  count: number;
  height: number;
  overscan: number;
}): RenderedVirtualRow[] {
  const initialCount = Math.min(
    count,
    Math.ceil(height / ESTIMATED_ROW_HEIGHT) + overscan,
  );

  return Array.from({ length: initialCount }, (_, index) => ({
    key: index,
    index,
    start: index * ESTIMATED_ROW_HEIGHT,
  }));
}

function getCopyFeedbackLabel(copyFeedback: CopyFeedback): string | null {
  if (!copyFeedback) {
    return null;
  }

  if (copyFeedback.status === "error") {
    return "Copy failed";
  }

  return copyFeedback.type === "path" ? "Path copied" : "Value copied";
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
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

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
  const copyFeedbackLabel = getCopyFeedbackLabel(copyFeedback);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  function scheduleCopyFeedbackReset() {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }

    copyTimeoutRef.current = setTimeout(() => {
      setCopyFeedback(null);
    }, COPY_FEEDBACK_DURATION_MS);
  }

  async function handleCopyPath() {
    try {
      await onCopyPath?.(row.path);

      if (!isMountedRef.current) {
        return;
      }

      setCopyFeedback({ type: "path", status: "success" });
    } catch {
      if (!isMountedRef.current) {
        return;
      }

      setCopyFeedback({ type: "path", status: "error" });
    }

    scheduleCopyFeedbackReset();
  }

  async function handleCopyValue() {
    try {
      await onCopyValue?.(row.value, row.path);

      if (!isMountedRef.current) {
        return;
      }

      setCopyFeedback({ type: "value", status: "success" });
    } catch {
      if (!isMountedRef.current) {
        return;
      }

      setCopyFeedback({ type: "value", status: "error" });
    }

    scheduleCopyFeedbackReset();
  }

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
        data-string-truncated={primitive?.isTruncated ? "true" : undefined}
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
          <span
            className={clsx("json-tree-value", `is-${row.type}`)}
            data-string-truncated={primitive?.isTruncated ? "true" : undefined}
          >
            <span className="json-tree-value-preview">{primitive?.text}</span>
            {primitive?.isTruncated && (
              <span className="json-tree-truncation">
                {" "}
                [truncated, {primitive.hiddenCharacterCount} more characters
                hidden]
              </span>
            )}
          </span>
        )}

        <div className="json-tree-actions">
          <button
            className="json-tree-action"
            type="button"
            title={
              copyFeedback?.type === "path"
                ? copyFeedbackLabel ?? ""
                : `Copy path ${row.path}`
            }
            aria-label={
              copyFeedback?.type === "path"
                ? copyFeedbackLabel ?? `Copy path ${row.path}`
                : `Copy path ${row.path}`
            }
            data-copy-status={
              copyFeedback?.type === "path" ? copyFeedback.status : undefined
            }
            onClick={handleCopyPath}
          >
            {copyFeedback?.type === "path" &&
            copyFeedback.status === "success" ? (
              <Check size={13} />
            ) : (
              <Route size={13} />
            )}
          </button>
          <button
            className="json-tree-action"
            type="button"
            title={
              copyFeedback?.type === "value"
                ? copyFeedbackLabel ?? ""
                : `Copy value ${row.path}`
            }
            aria-label={
              copyFeedback?.type === "value"
                ? copyFeedbackLabel ?? `Copy value ${row.path}`
                : `Copy value ${row.path}`
            }
            data-copy-status={
              copyFeedback?.type === "value" ? copyFeedback.status : undefined
            }
            onClick={handleCopyValue}
          >
            {copyFeedback?.type === "value" &&
            copyFeedback.status === "success" ? (
              <Check size={13} />
            ) : (
              <Copy size={13} />
            )}
          </button>
        </div>
        {copyFeedbackLabel && (
          <span
            className="json-tree-copy-feedback"
            data-copy-status={copyFeedback?.status}
            role="status"
          >
            {copyFeedbackLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export function JsonTreeCore({
  data,
  rootName = "root",
  defaultExpandedDepth = 1,
  maxRenderedRows = PAYLOAD_LIMITS.maxInitialRenderedNodes,
  maxDepth = PAYLOAD_LIMITS.maxDepth,
  previewStringLength = PAYLOAD_LIMITS.previewStringLength,
  searchQuery = "",
  activeMatchIndex = -1,
  virtualizeAbove = PAYLOAD_LIMITS.maxInitialRenderedNodes,
  virtualizedHeight = 480,
  virtualizedOverscan = 12,
  onLoadFullTree,
  onSearchMatchesChange,
  onCopyPath,
  onCopyValue,
}: JsonTreeCoreProps) {
  const scrollParentRef = useRef<HTMLDivElement | null>(null);
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
  const normalizedMaxRenderedRows = Math.max(1, maxRenderedRows);
  const [renderLimitState, setRenderLimitState] = useState<RenderLimitState>(
    () => ({
      data,
      rootName,
      maxRenderedRows: normalizedMaxRenderedRows,
      isFullTreeLoaded: false,
    }),
  );
  const isFullTreeLoaded =
    renderLimitState.data === data &&
    renderLimitState.rootName === rootName &&
    renderLimitState.maxRenderedRows === normalizedMaxRenderedRows
      ? renderLimitState.isFullTreeLoaded
      : false;
  const isRenderLimited =
    rows.length > normalizedMaxRenderedRows && !isFullTreeLoaded;
  const renderedRows = isRenderLimited
    ? rows.slice(0, normalizedMaxRenderedRows)
    : rows;
  const activeMatchPath =
    activeMatchIndex >= 0 && activeMatchIndex < searchMatches.length
      ? searchMatches[activeMatchIndex].path
      : null;
  const shouldVirtualize = renderedRows.length > virtualizeAbove;
  // TanStack Virtual intentionally returns mutable instance methods.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: renderedRows.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    getItemKey: (index) => renderedRows[index]?.path ?? index,
    overscan: virtualizedOverscan,
    initialRect: {
      width: 0,
      height: virtualizedHeight,
    },
  });
  const measuredVirtualRows = rowVirtualizer.getVirtualItems();
  const virtualRows: RenderedVirtualRow[] = shouldVirtualize
    ? measuredVirtualRows.length > 0
      ? measuredVirtualRows
      : getInitialVirtualRows({
          count: renderedRows.length,
          height: virtualizedHeight,
          overscan: virtualizedOverscan,
        })
    : [];

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

  function loadFullTree() {
    setRenderLimitState({
      data,
      rootName,
      maxRenderedRows: normalizedMaxRenderedRows,
      isFullTreeLoaded: true,
    });
    onLoadFullTree?.(rows.length);
  }

  function renderTreeRow(row: JsonTreeRow) {
    return (
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
    );
  }

  return (
    <section
      className="json-tree-core"
      aria-label="JSON tree"
      data-virtualized={shouldVirtualize ? "true" : "false"}
      data-row-count={rows.length}
      data-rendered-row-count={renderedRows.length}
      data-render-limited={isRenderLimited ? "true" : "false"}
    >
      {isRenderLimited && (
        <div
          className="json-tree-render-limit"
          data-testid="json-tree-render-limit"
          role="status"
        >
          <div>
            <strong>Rendering limited for performance</strong>
            <span>
              Showing {renderedRows.length} of {rows.length} visible rows.
            </span>
          </div>
          <button
            className="json-tree-load-full"
            type="button"
            onClick={loadFullTree}
          >
            Load full tree
          </button>
        </div>
      )}
      <div
        ref={scrollParentRef}
        className={clsx(
          "json-tree-viewport",
          shouldVirtualize && "is-virtualized",
        )}
        data-testid="json-tree-viewport"
        style={
          shouldVirtualize
            ? ({
                "--json-tree-virtual-height": `${virtualizedHeight}px`,
              } as CSSProperties)
            : undefined
        }
      >
        {shouldVirtualize ? (
          <div
            className="json-tree-virtual-spacer"
            data-testid="json-tree-virtual-spacer"
            style={{ height: rowVirtualizer.getTotalSize() }}
          >
            {virtualRows.map((virtualRow) => {
              const row = renderedRows[virtualRow.index];

              if (!row) {
                return null;
              }

              return (
                <div
                  key={virtualRow.key}
                  className="json-tree-virtual-item"
                  data-index={virtualRow.index}
                  data-testid={`json-tree-virtual-item:${row.path}`}
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {renderTreeRow(row)}
                </div>
              );
            })}
          </div>
        ) : (
          renderedRows.map((row) => renderTreeRow(row))
        )}
      </div>
    </section>
  );
}
