import { ChevronDown, ChevronRight, Copy, Route } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
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
  onCopyPath?: (path: string) => void;
  onCopyValue?: (value: JsonValue, path: string) => void;
};

type TreeNodeProps = {
  nodeKey: string | number | null;
  value: JsonValue;
  pathSegments: JsonPathSegment[];
  depth: number;
  defaultExpandedDepth: number;
  maxDepth: number;
  previewStringLength: number;
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

function TreeNode({
  nodeKey,
  value,
  pathSegments,
  depth,
  defaultExpandedDepth,
  maxDepth,
  previewStringLength,
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

  const entries = useMemo(() => {
    if (Array.isArray(value)) {
      return value.map((item, index) => [index, item] as const);
    }

    if (typeof value === "object" && value !== null) {
      return Object.entries(value);
    }

    return [];
  }, [value]);

  const isAtMaxDepth = isContainer && depth >= maxDepth;
  const isEmptyContainer = isContainer && entries.length === 0;
  const canToggle = isContainer && !isAtMaxDepth && !isEmptyContainer;
  const primitive = !isContainer
    ? formatPrimitive(value, previewStringLength)
    : null;
  const toggleAction = isExpanded ? "Collapse" : "Expand";

  return (
    <div className="json-tree-node" data-depth={depth} data-json-path={path}>
      <div
        className="json-tree-row"
        data-testid={`json-tree-row:${path}`}
        data-json-path={path}
        data-json-type={valueType}
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
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
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

      {isContainer && canToggle && isExpanded && (
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
  onCopyPath,
  onCopyValue,
}: JsonTreeCoreProps) {
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
        onCopyPath={onCopyPath}
        onCopyValue={onCopyValue}
      />
    </section>
  );
}
