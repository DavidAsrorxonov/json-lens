import { describe, expect, it } from "vitest";
import {
  flattenJsonTree,
  getJsonTreeContainerSummary,
  getJsonTreeValueType,
} from "../jsonTreeModel";

describe("getJsonTreeValueType", () => {
  it("returns JSON value types", () => {
    expect(getJsonTreeValueType({})).toBe("object");
    expect(getJsonTreeValueType([])).toBe("array");
    expect(getJsonTreeValueType("value")).toBe("string");
    expect(getJsonTreeValueType(1)).toBe("number");
    expect(getJsonTreeValueType(true)).toBe("boolean");
    expect(getJsonTreeValueType(null)).toBe("null");
  });
});

describe("getJsonTreeContainerSummary", () => {
  it("summarizes arrays and objects", () => {
    expect(getJsonTreeContainerSummary([])).toBe("0 items");
    expect(getJsonTreeContainerSummary(["one"])).toBe("1 item");
    expect(getJsonTreeContainerSummary(["one", "two"])).toBe("2 items");
    expect(getJsonTreeContainerSummary({})).toBe("0 keys");
    expect(getJsonTreeContainerSummary({ one: true })).toBe("1 key");
    expect(getJsonTreeContainerSummary({ one: true, two: false })).toBe(
      "2 keys",
    );
  });

  it("returns an empty summary for primitives", () => {
    expect(getJsonTreeContainerSummary("value")).toBe("");
    expect(getJsonTreeContainerSummary(1)).toBe("");
    expect(getJsonTreeContainerSummary(false)).toBe("");
    expect(getJsonTreeContainerSummary(null)).toBe("");
  });
});

describe("flattenJsonTree", () => {
  it("returns the root row by default", () => {
    const rows = flattenJsonTree({
      data: { data: true },
      rootName: "response",
      maxDepth: 10,
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      path: "$",
      pathSegments: [],
      key: "response",
      type: "object",
      depth: 0,
      isContainer: true,
      isEmptyContainer: false,
      isAtMaxDepth: false,
      summary: "1 key",
    });
    expect(rows[1]).toMatchObject({
      path: "$.data",
      pathSegments: ["data"],
      key: "data",
      value: true,
      type: "boolean",
      depth: 1,
      isContainer: false,
      isEmptyContainer: false,
      isAtMaxDepth: false,
      summary: "",
    });
  });

  it("returns rows in depth-first tree order", () => {
    const rows = flattenJsonTree({
      data: {
        data: {
          items: [{ id: 1 }, { id: 2 }],
        },
        meta: null,
      },
      expandedPaths: new Set(["$", "$.data", "$.data.items", "$.data.items[0]"]),
      maxDepth: 10,
    });

    expect(rows.map((row) => row.path)).toEqual([
      "$",
      "$.data",
      "$.data.items",
      "$.data.items[0]",
      "$.data.items[0].id",
      "$.data.items[1]",
      "$.meta",
    ]);
  });

  it("only includes children for expanded container paths", () => {
    const rows = flattenJsonTree({
      data: {
        expanded: { child: true },
        collapsed: { child: false },
      },
      expandedPaths: new Set(["$", "$.expanded"]),
      maxDepth: 10,
    });

    expect(rows.map((row) => row.path)).toEqual([
      "$",
      "$.expanded",
      "$.expanded.child",
      "$.collapsed",
    ]);
  });

  it("marks empty objects and arrays", () => {
    const rows = flattenJsonTree({
      data: {
        emptyObject: {},
        emptyArray: [],
      },
      expandedPaths: new Set(["$"]),
      maxDepth: 10,
    });

    expect(rows.find((row) => row.path === "$.emptyObject")).toMatchObject({
      type: "object",
      isContainer: true,
      isEmptyContainer: true,
      summary: "0 keys",
    });
    expect(rows.find((row) => row.path === "$.emptyArray")).toMatchObject({
      type: "array",
      isContainer: true,
      isEmptyContainer: true,
      summary: "0 items",
    });
  });

  it("stops traversal at max depth", () => {
    const rows = flattenJsonTree({
      data: {
        level1: {
          level2: {
            level3: true,
          },
        },
      },
      expandedPaths: new Set(["$", "$.level1", "$.level1.level2"]),
      maxDepth: 2,
    });

    expect(rows.map((row) => row.path)).toEqual([
      "$",
      "$.level1",
      "$.level1.level2",
    ]);
    expect(rows[2]).toMatchObject({
      path: "$.level1.level2",
      isAtMaxDepth: true,
    });
  });

  it("formats array and quoted object-key paths", () => {
    const rows = flattenJsonTree({
      data: {
        "user-email": ["a@example.com"],
      },
      expandedPaths: new Set(["$", '$["user-email"]']),
      maxDepth: 10,
    });

    expect(rows.map((row) => row.path)).toEqual([
      "$",
      '$["user-email"]',
      '$["user-email"][0]',
    ]);
    expect(rows[1]?.pathSegments).toEqual(["user-email"]);
    expect(rows[2]).toMatchObject({
      key: 0,
      pathSegments: ["user-email", 0],
      type: "string",
      depth: 2,
    });
  });

  it("handles a primitive root", () => {
    const rows = flattenJsonTree({
      data: "root value",
      rootName: "response",
      maxDepth: 10,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      path: "$",
      key: "response",
      value: "root value",
      type: "string",
      depth: 0,
      isContainer: false,
      summary: "",
    });
  });
});
