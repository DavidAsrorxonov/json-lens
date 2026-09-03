import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import clsx from "clsx";
import type { JsonPathSegment, JsonValue } from "../lib";
import { formatJsonPath, isJsonContainer } from "../lib";
import "./JsonTreeCore.css";

export type JsonTreeCoreProps = {
  data: JsonValue;
  rootName?: string;
  defaultExpandedDepth?: number;
  onCopyPath?: (path: string) => void;
  onCopyValue?: (value: JsonValue, path: string) => void;
};

type TreeNodeProps = {
  nodeKey: string | number | null;
  value: JsonValue;
  pathSegments: JsonPathSegment[];
  depth: number;
  defaultExpandedDepth: number;
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

function formatPrimitive(value: JsonValue): string {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  return String(value);
}

function TreeNode({
  nodeKey,
  value,
  pathSegments,
  depth,
  defaultExpandedDepth,
  onCopyPath,
  onCopyValue,
}: TreeNodeProps) {
  const isContainer = isJsonContainer(value);
  const [isExpanded, setIsExpanded] = useState(depth < defaultExpandedDepth);
  const path = useMemo(() => formatJsonPath(pathSegments), [pathSegments]);
  const valueType = getValueType(value);

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

  return (
    <div className="json-tree-node" data-depth={depth}>
      <div className="json-tree-row" style={rowStyle}>
        <button
          className={clsx("json-tree-toggle", !isContainer && "is-hidden")}
          type="button"
          aria-label={isExpanded ? "Collapse node" : "Expand node"}
          aria-expanded={isContainer ? isExpanded : undefined}
          onClick={() => setIsExpanded((current) => !current)}
          disabled={!isContainer}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {nodeKey !== null && (
          <>
            <span className="json-tree-key">
              {JSON.stringify(String(nodeKey))}
            </span>
            <span className="json-tree-colon">:</span>
          </>
        )}

        {isContainer ? (
          <button
            className="json-tree-container-label"
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
          >
            <span className={clsx("json-tree-type", `is-${valueType}`)}>
              {Array.isArray(value) ? "Array" : "Object"}
            </span>
            <span className="json-tree-summary">
              {getContainerSummary(value)}
            </span>
          </button>
        ) : (
          <span className={clsx("json-tree-value", `is-${valueType}`)}>
            {formatPrimitive(value)}
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
            <Copy size={13} />
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

      {isContainer && isExpanded && (
        <div className="json-tree-children">
          {entries.map(([childKey, childValue]) => (
            <TreeNode
              key={String(childKey)}
              nodeKey={childKey}
              value={childValue}
              pathSegments={[...pathSegments, childKey]}
              depth={depth + 1}
              defaultExpandedDepth={defaultExpandedDepth}
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
        onCopyPath={onCopyPath}
        onCopyValue={onCopyValue}
      />
    </section>
  );
}
