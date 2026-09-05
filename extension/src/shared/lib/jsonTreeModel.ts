import { formatJsonPath, type JsonPathSegment } from "./jsonPath";
import { isJsonContainer, type JsonValue } from "./jsonTypes";

export type JsonTreeValueType =
  | "object"
  | "array"
  | "string"
  | "number"
  | "boolean"
  | "null";

export type JsonTreeRow = {
  path: string;
  pathSegments: JsonPathSegment[];
  key: string | number | null;
  value: JsonValue;
  type: JsonTreeValueType;
  depth: number;
  isContainer: boolean;
  isEmptyContainer: boolean;
  isAtMaxDepth: boolean;
  summary: string;
};

export type FlattenJsonTreeOptions = {
  data: JsonValue;
  rootName?: string;
  expandedPaths?: ReadonlySet<string>;
  maxDepth: number;
};

export function flattenJsonTree({
  data,
  rootName = "root",
  expandedPaths = new Set(["$"]),
  maxDepth,
}: FlattenJsonTreeOptions): JsonTreeRow[] {
  const rows: JsonTreeRow[] = [];

  visitJsonTreeNode({
    rows,
    key: rootName,
    value: data,
    pathSegments: [],
    depth: 0,
    expandedPaths,
    maxDepth,
  });

  return rows;
}

export function getJsonTreeValueType(value: JsonValue): JsonTreeValueType {
  if (Array.isArray(value)) {
    return "array";
  }

  switch (typeof value) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      return value === null ? "null" : "object";
  }
}

export function getJsonTreeContainerSummary(value: JsonValue): string {
  if (Array.isArray(value)) {
    return `${value.length} ${value.length === 1 ? "item" : "items"}`;
  }

  if (typeof value === "object" && value !== null) {
    const count = Object.keys(value).length;

    return `${count} ${count === 1 ? "key" : "keys"}`;
  }

  return "";
}

function visitJsonTreeNode({
  rows,
  key,
  value,
  pathSegments,
  depth,
  expandedPaths,
  maxDepth,
}: {
  rows: JsonTreeRow[];
  key: string | number | null;
  value: JsonValue;
  pathSegments: JsonPathSegment[];
  depth: number;
  expandedPaths: ReadonlySet<string>;
  maxDepth: number;
}) {
  const path = formatJsonPath(pathSegments);
  const isContainer = isJsonContainer(value);
  const entries = getJsonTreeEntries(value);
  const isEmptyContainer = isContainer && entries.length === 0;
  const isAtMaxDepth = isContainer && depth >= maxDepth;

  rows.push({
    path,
    pathSegments,
    key,
    value,
    type: getJsonTreeValueType(value),
    depth,
    isContainer,
    isEmptyContainer,
    isAtMaxDepth,
    summary: getJsonTreeContainerSummary(value),
  });

  if (
    !isContainer ||
    isEmptyContainer ||
    isAtMaxDepth ||
    !expandedPaths.has(path)
  ) {
    return;
  }

  for (const [childKey, childValue] of entries) {
    visitJsonTreeNode({
      rows,
      key: childKey,
      value: childValue,
      pathSegments: [...pathSegments, childKey],
      depth: depth + 1,
      expandedPaths,
      maxDepth,
    });
  }
}

function getJsonTreeEntries(
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
