import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JsonTreeCore } from "./JsonTreeCore";
import type { JsonValue } from "../lib";

afterEach(() => {
  cleanup();
});

const sampleData: JsonValue = {
  data: {
    items: [
      {
        id: 1,
        email: "a@example.com",
        active: true,
        profile: null,
      },
    ],
  },
};

function createLargeArray(size: number): JsonValue {
  return Array.from({ length: size }, (_, index) => ({
    id: index,
    label: `Item ${index}`,
  }));
}

describe("JsonTreeCore", () => {
  it("renders the root container", () => {
    render(<JsonTreeCore data={sampleData} rootName="response" />);

    const rootRow = screen.getByTestId("json-tree-row:$");

    expect(within(rootRow).getByText('"response"')).toBeInTheDocument();
    expect(within(rootRow).getByText("Object")).toBeInTheDocument();
    expect(within(rootRow).getByText("1 key")).toBeInTheDocument();
    expect(rootRow).toHaveAttribute("data-json-path", "$");
    expect(rootRow).toHaveAttribute("data-json-type", "object");
  });

  it("renders nested values when expanded by default depth", () => {
    render(
      <JsonTreeCore
        data={sampleData}
        rootName="response"
        defaultExpandedDepth={4}
      />,
    );

    expect(screen.getByText('"email"')).toBeInTheDocument();
    expect(screen.getByText('"a@example.com"')).toBeInTheDocument();
    expect(screen.getByText('"active"')).toBeInTheDocument();
    expect(screen.getByText("true")).toBeInTheDocument();
    expect(screen.getByText("null")).toBeInTheDocument();
  });

  it("collapses and expands container nodes", async () => {
    const user = userEvent.setup();

    render(
      <JsonTreeCore
        data={sampleData}
        rootName="response"
        defaultExpandedDepth={1}
      />,
    );

    expect(screen.getByText('"data"')).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Collapse response at $",
      }),
    );

    expect(screen.queryByText('"data"')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Expand response at $",
      }),
    );

    expect(screen.getByText('"data"')).toBeInTheDocument();
  });

  it("renders visible rows in flattened tree order", () => {
    render(
      <JsonTreeCore
        data={sampleData}
        rootName="response"
        defaultExpandedDepth={4}
      />,
    );

    const rowPaths = screen
      .getAllByTestId(/^json-tree-row:/)
      .map((row) => row.getAttribute("data-json-path"));

    expect(rowPaths).toEqual([
      "$",
      "$.data",
      "$.data.items",
      "$.data.items[0]",
      "$.data.items[0].id",
      "$.data.items[0].email",
      "$.data.items[0].active",
      "$.data.items[0].profile",
    ]);
  });

  it("removes descendant rows when a nested container collapses", async () => {
    const user = userEvent.setup();

    render(
      <JsonTreeCore
        data={sampleData}
        rootName="response"
        defaultExpandedDepth={4}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Collapse data at $.data",
      }),
    );

    expect(screen.getByTestId("json-tree-row:$.data")).toBeInTheDocument();
    expect(screen.queryByTestId("json-tree-row:$.data.items")).toBeNull();
    expect(
      screen.queryByTestId("json-tree-row:$.data.items[0].id"),
    ).toBeNull();
  });

  it("temporarily reveals search matches after manual collapse", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <JsonTreeCore
        data={sampleData}
        rootName="response"
        defaultExpandedDepth={4}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Collapse data at $.data",
      }),
    );

    expect(screen.queryByTestId("json-tree-row:$.data.items[0].email")).toBeNull();

    rerender(
      <JsonTreeCore
        data={sampleData}
        rootName="response"
        defaultExpandedDepth={4}
        searchQuery="a@example.com"
      />,
    );

    expect(
      screen.getByTestId("json-tree-row:$.data.items[0].email"),
    ).toHaveClass("is-search-match");
  });

  it("calls copy path with formatted JSON path", async () => {
    const user = userEvent.setup();
    const onCopyPath = vi.fn();

    render(
      <JsonTreeCore
        data={sampleData}
        rootName="response"
        defaultExpandedDepth={4}
        onCopyPath={onCopyPath}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Copy path $.data.items[0].id",
      }),
    );

    expect(onCopyPath).toHaveBeenCalledWith("$.data.items[0].id");
  });

  it("calls copy value with value and path", async () => {
    const user = userEvent.setup();
    const onCopyValue = vi.fn();

    render(
      <JsonTreeCore
        data={sampleData}
        rootName="response"
        defaultExpandedDepth={4}
        onCopyValue={onCopyValue}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Copy value $.data.items[0].id",
      }),
    );

    expect(onCopyValue).toHaveBeenCalledWith(1, "$.data.items[0].id");
  });

  it("renders empty objects and arrays without expandable toggles", () => {
    render(
      <JsonTreeCore
        data={{ emptyObject: {}, emptyArray: [] }}
        rootName="response"
        defaultExpandedDepth={2}
      />,
    );

    const emptyObjectRow = screen.getByTestId("json-tree-row:$.emptyObject");
    const emptyArrayRow = screen.getByTestId("json-tree-row:$.emptyArray");

    expect(within(emptyObjectRow).getByText("0 keys")).toBeInTheDocument();
    expect(within(emptyObjectRow).getByText("empty")).toBeInTheDocument();
    expect(emptyObjectRow.querySelector(".json-tree-toggle")).toBeDisabled();

    expect(within(emptyArrayRow).getByText("0 items")).toBeInTheDocument();
    expect(within(emptyArrayRow).getByText("empty")).toBeInTheDocument();
  });

  it("renders array indexes as numeric labels", () => {
    render(
      <JsonTreeCore
        data={["first"]}
        rootName="response"
        defaultExpandedDepth={2}
      />,
    );

    const itemRow = screen.getByTestId("json-tree-row:$[0]");

    expect(within(itemRow).getByText("0")).toBeInTheDocument();
    expect(within(itemRow).getByText('"first"')).toBeInTheDocument();
    expect(itemRow).toHaveAttribute("data-json-type", "string");
  });

  it("supports paths for object keys that require quoting", async () => {
    const user = userEvent.setup();
    const onCopyPath = vi.fn();

    render(
      <JsonTreeCore
        data={{ "user-email": "a@example.com" }}
        rootName="response"
        defaultExpandedDepth={2}
        onCopyPath={onCopyPath}
      />,
    );

    const weirdKeyRow = screen.getByTestId('json-tree-row:$["user-email"]');

    expect(within(weirdKeyRow).getByText('"user-email"')).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: 'Copy path $["user-email"]',
      }),
    );

    expect(onCopyPath).toHaveBeenCalledWith('$["user-email"]');
  });

  it("previews long strings without changing copied values", async () => {
    const user = userEvent.setup();
    const onCopyValue = vi.fn();
    const longValue = "abcdefghij";

    render(
      <JsonTreeCore
        data={{ token: longValue }}
        rootName="response"
        defaultExpandedDepth={2}
        previewStringLength={4}
        onCopyValue={onCopyValue}
      />,
    );

    const tokenRow = screen.getByTestId("json-tree-row:$.token");

    expect(tokenRow).toHaveAttribute("data-string-truncated", "true");
    expect(within(tokenRow).getByText('"abcd..."')).toBeInTheDocument();
    expect(
      within(tokenRow).getByText("[truncated, 6 more characters hidden]"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Copy value $.token",
      }),
    );

    expect(onCopyValue).toHaveBeenCalledWith(longValue, "$.token");
  });

  it("shows value copy success feedback after the copy callback resolves", async () => {
    const onCopyValue = vi.fn().mockResolvedValue(undefined);

    render(
      <JsonTreeCore
        data={{ token: "abc" }}
        rootName="response"
        defaultExpandedDepth={2}
        onCopyValue={onCopyValue}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Copy value $.token",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("Value copied")).toBeInTheDocument();
    });
    expect(onCopyValue).toHaveBeenCalledWith("abc", "$.token");
  });

  it("shows copy failure feedback when the copy callback rejects", async () => {
    const onCopyPath = vi.fn().mockRejectedValue(new Error("denied"));

    render(
      <JsonTreeCore
        data={{ token: "abc" }}
        rootName="response"
        defaultExpandedDepth={2}
        onCopyPath={onCopyPath}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Copy path $.token",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("Copy failed")).toBeInTheDocument();
    });
    expect(onCopyPath).toHaveBeenCalledWith("$.token");
  });

  it("stops rendering children at the max depth", () => {
    render(
      <JsonTreeCore
        data={{ level1: { level2: { level3: true } } }}
        rootName="response"
        defaultExpandedDepth={5}
        maxDepth={2}
      />,
    );

    const level2Row = screen.getByTestId("json-tree-row:$.level1.level2");

    expect(within(level2Row).getByText("max depth reached")).toBeInTheDocument();
    expect(screen.queryByText('"level3"')).not.toBeInTheDocument();
    expect(level2Row.querySelector(".json-tree-toggle")).toBeDisabled();
  });

  it("marks rows that match object keys", () => {
    render(
      <JsonTreeCore
        data={sampleData}
        rootName="response"
        defaultExpandedDepth={0}
        searchQuery="email"
      />,
    );

    const emailRow = screen.getByTestId("json-tree-row:$.data.items[0].email");

    expect(emailRow).toHaveClass("is-search-match");
    expect(emailRow).toHaveAttribute("data-search-match", "true");
  });

  it("marks rows that match primitive values", () => {
    render(
      <JsonTreeCore
        data={sampleData}
        rootName="response"
        defaultExpandedDepth={0}
        searchQuery="a@example.com"
      />,
    );

    const emailRow = screen.getByTestId("json-tree-row:$.data.items[0].email");

    expect(emailRow).toHaveClass("is-search-match");
    expect(within(emailRow).getByText('"a@example.com"')).toBeInTheDocument();
  });

  it("marks rows that match JSON paths", () => {
    render(
      <JsonTreeCore
        data={sampleData}
        rootName="response"
        defaultExpandedDepth={0}
        searchQuery="items[0].active"
      />,
    );

    const activeRow = screen.getByTestId(
      "json-tree-row:$.data.items[0].active",
    );

    expect(activeRow).toHaveClass("is-search-match");
    expect(within(activeRow).getByText("true")).toBeInTheDocument();
  });

  it("auto-expands collapsed ancestors while searching", () => {
    render(
      <JsonTreeCore
        data={sampleData}
        rootName="response"
        defaultExpandedDepth={0}
        searchQuery="profile"
      />,
    );

    const rootRow = screen.getByTestId("json-tree-row:$");
    const dataRow = screen.getByTestId("json-tree-row:$.data");
    const itemRow = screen.getByTestId("json-tree-row:$.data.items[0]");
    const profileRow = screen.getByTestId(
      "json-tree-row:$.data.items[0].profile",
    );

    expect(rootRow).toHaveClass("has-search-match");
    expect(dataRow).toHaveClass("has-search-match");
    expect(itemRow).toHaveClass("has-search-match");
    expect(profileRow).toHaveClass("is-search-match");
  });

  it("matches search queries case-insensitively", () => {
    render(
      <JsonTreeCore
        data={sampleData}
        rootName="response"
        defaultExpandedDepth={0}
        searchQuery="A@EXAMPLE.COM"
      />,
    );

    expect(
      screen.getByTestId("json-tree-row:$.data.items[0].email"),
    ).toHaveClass("is-search-match");
  });

  it("does not reveal matching descendants beyond max depth", () => {
    render(
      <JsonTreeCore
        data={{ level1: { level2: { secret: "hidden" } } }}
        rootName="response"
        defaultExpandedDepth={3}
        maxDepth={2}
        searchQuery="secret"
      />,
    );

    const level2Row = screen.getByTestId("json-tree-row:$.level1.level2");

    expect(level2Row).not.toHaveClass("has-search-match");
    expect(within(level2Row).getByText("max depth reached")).toBeInTheDocument();
    expect(screen.queryByText('"secret"')).not.toBeInTheDocument();
  });

  it("reports empty matches when search is empty", async () => {
    const onSearchMatchesChange = vi.fn();

    render(
      <JsonTreeCore
        data={sampleData}
        rootName="response"
        onSearchMatchesChange={onSearchMatchesChange}
      />,
    );

    await waitFor(() => {
      expect(onSearchMatchesChange).toHaveBeenLastCalledWith([]);
    });
  });

  it("reports key and value matches in tree order", async () => {
    const onSearchMatchesChange = vi.fn();

    render(
      <JsonTreeCore
        data={{ matchKey: false, plain: "match" }}
        rootName="response"
        searchQuery="match"
        onSearchMatchesChange={onSearchMatchesChange}
      />,
    );

    await waitFor(() => {
      expect(onSearchMatchesChange).toHaveBeenLastCalledWith([
        { path: "$.matchKey", type: "key" },
        { path: "$.plain", type: "value" },
      ]);
    });
  });

  it("reports path matches", async () => {
    const onSearchMatchesChange = vi.fn();

    render(
      <JsonTreeCore
        data={{ group: { child: false } }}
        rootName="response"
        searchQuery="group.child"
        onSearchMatchesChange={onSearchMatchesChange}
      />,
    );

    await waitFor(() => {
      expect(onSearchMatchesChange).toHaveBeenLastCalledWith([
        { path: "$.group.child", type: "path" },
      ]);
    });
  });

  it("reports one match per row using key, value, then path priority", async () => {
    const onSearchMatchesChange = vi.fn();

    render(
      <JsonTreeCore
        data={{ id: "id" }}
        rootName="response"
        searchQuery="id"
        onSearchMatchesChange={onSearchMatchesChange}
      />,
    );

    await waitFor(() => {
      expect(onSearchMatchesChange).toHaveBeenLastCalledWith([
        { path: "$.id", type: "key" },
      ]);
    });
  });

  it("reports only reachable matches within max depth", async () => {
    const onSearchMatchesChange = vi.fn();

    render(
      <JsonTreeCore
        data={{ level1: { level2: { secret: "hidden" } }, visible: "hidden" }}
        rootName="response"
        maxDepth={2}
        searchQuery="hidden"
        onSearchMatchesChange={onSearchMatchesChange}
      />,
    );

    await waitFor(() => {
      expect(onSearchMatchesChange).toHaveBeenLastCalledWith([
        { path: "$.visible", type: "value" },
      ]);
    });
  });

  it("marks the active search match", () => {
    render(
      <JsonTreeCore
        data={{ first: "needle", second: "needle" }}
        rootName="response"
        defaultExpandedDepth={2}
        searchQuery="needle"
        activeMatchIndex={1}
      />,
    );

    const firstRow = screen.getByTestId("json-tree-row:$.first");
    const secondRow = screen.getByTestId("json-tree-row:$.second");

    expect(firstRow).not.toHaveClass("is-active-search-match");
    expect(secondRow).toHaveClass("is-active-search-match");
    expect(secondRow).toHaveAttribute("data-active-search-match", "true");
  });

  it("does not mark an active search match for invalid active indexes", () => {
    const { container } = render(
      <JsonTreeCore
        data={{ first: "needle" }}
        rootName="response"
        defaultExpandedDepth={2}
        searchQuery="needle"
        activeMatchIndex={4}
      />,
    );

    expect(container.querySelector(".is-active-search-match")).toBeNull();
  });

  it("uses the non-virtual render path below the virtualization threshold", () => {
    render(
      <JsonTreeCore
        data={{ first: true }}
        rootName="response"
        defaultExpandedDepth={2}
        virtualizeAbove={20}
      />,
    );

    expect(screen.getByLabelText("JSON tree")).toHaveAttribute(
      "data-virtualized",
      "false",
    );
    expect(screen.queryByTestId("json-tree-virtual-spacer")).toBeNull();
    expect(screen.getByTestId("json-tree-row:$.first")).toBeInTheDocument();
  });

  it("virtualizes visible rows above the virtualization threshold", () => {
    render(
      <JsonTreeCore
        data={createLargeArray(100)}
        rootName="response"
        defaultExpandedDepth={1}
        virtualizeAbove={20}
        virtualizedHeight={130}
        virtualizedOverscan={1}
      />,
    );

    const tree = screen.getByLabelText("JSON tree");
    const renderedRows = screen.getAllByTestId(/^json-tree-row:/);

    expect(tree).toHaveAttribute("data-virtualized", "true");
    expect(tree).toHaveAttribute("data-row-count", "101");
    expect(screen.getByTestId("json-tree-virtual-spacer")).toBeInTheDocument();
    expect(screen.getByTestId("json-tree-row:$")).toBeInTheDocument();
    expect(renderedRows.length).toBeLessThan(101);
  });

  it("keeps search match reporting independent from virtualized rendering", async () => {
    const onSearchMatchesChange = vi.fn();

    render(
      <JsonTreeCore
        data={createLargeArray(100)}
        rootName="response"
        defaultExpandedDepth={1}
        searchQuery="Item 99"
        virtualizeAbove={20}
        virtualizedHeight={130}
        virtualizedOverscan={1}
        onSearchMatchesChange={onSearchMatchesChange}
      />,
    );

    await waitFor(() => {
      expect(onSearchMatchesChange).toHaveBeenLastCalledWith([
        { path: "$[99].label", type: "value" },
      ]);
    });
  });

  it("renders normally when visible rows are under the render limit", () => {
    render(
      <JsonTreeCore
        data={{ first: true, second: false }}
        rootName="response"
        defaultExpandedDepth={1}
        maxRenderedRows={5}
      />,
    );

    const tree = screen.getByLabelText("JSON tree");

    expect(tree).toHaveAttribute("data-render-limited", "false");
    expect(tree).toHaveAttribute("data-row-count", "3");
    expect(tree).toHaveAttribute("data-rendered-row-count", "3");
    expect(screen.queryByTestId("json-tree-render-limit")).toBeNull();
    expect(screen.getByTestId("json-tree-row:$.second")).toBeInTheDocument();
  });

  it("limits rendered rows and shows a large tree warning", () => {
    render(
      <JsonTreeCore
        data={createLargeArray(20)}
        rootName="response"
        defaultExpandedDepth={1}
        maxRenderedRows={8}
        virtualizeAbove={100}
      />,
    );

    const tree = screen.getByLabelText("JSON tree");
    const renderedRows = screen.getAllByTestId(/^json-tree-row:/);

    expect(tree).toHaveAttribute("data-render-limited", "true");
    expect(tree).toHaveAttribute("data-row-count", "21");
    expect(tree).toHaveAttribute("data-rendered-row-count", "8");
    expect(screen.getByTestId("json-tree-render-limit")).toHaveTextContent(
      "Rendering limited for performance",
    );
    expect(screen.getByTestId("json-tree-render-limit")).toHaveTextContent(
      "Showing 8 of 21 visible rows.",
    );
    expect(renderedRows).toHaveLength(8);
    expect(screen.getByTestId("json-tree-row:$[6]")).toBeInTheDocument();
    expect(screen.queryByTestId("json-tree-row:$[7]")).toBeNull();
  });

  it("loads the full tree after the user confirms rendering all rows", async () => {
    const user = userEvent.setup();
    const onLoadFullTree = vi.fn();

    render(
      <JsonTreeCore
        data={createLargeArray(20)}
        rootName="response"
        defaultExpandedDepth={1}
        maxRenderedRows={8}
        virtualizeAbove={100}
        onLoadFullTree={onLoadFullTree}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Load full tree",
      }),
    );

    const tree = screen.getByLabelText("JSON tree");

    expect(tree).toHaveAttribute("data-render-limited", "false");
    expect(tree).toHaveAttribute("data-row-count", "21");
    expect(tree).toHaveAttribute("data-rendered-row-count", "21");
    expect(screen.queryByTestId("json-tree-render-limit")).toBeNull();
    expect(screen.getByTestId("json-tree-row:$[19]")).toBeInTheDocument();
    expect(onLoadFullTree).toHaveBeenCalledWith(21);
  });

  it("keeps search match reporting independent from render limits", async () => {
    const onSearchMatchesChange = vi.fn();

    render(
      <JsonTreeCore
        data={createLargeArray(20)}
        rootName="response"
        defaultExpandedDepth={1}
        maxRenderedRows={8}
        searchQuery="Item 19"
        virtualizeAbove={100}
        onSearchMatchesChange={onSearchMatchesChange}
      />,
    );

    await waitFor(() => {
      expect(onSearchMatchesChange).toHaveBeenLastCalledWith([
        { path: "$[19].label", type: "value" },
      ]);
    });

    expect(screen.queryByTestId("json-tree-row:$[19].label")).toBeNull();
    expect(screen.getByTestId("json-tree-render-limit")).toBeInTheDocument();
  });

  it("normalizes invalid render limits to at least one rendered row", () => {
    render(
      <JsonTreeCore
        data={createLargeArray(3)}
        rootName="response"
        defaultExpandedDepth={1}
        maxRenderedRows={0}
        virtualizeAbove={100}
      />,
    );

    expect(screen.getByLabelText("JSON tree")).toHaveAttribute(
      "data-rendered-row-count",
      "1",
    );
    expect(screen.getAllByTestId(/^json-tree-row:/)).toHaveLength(1);
    expect(screen.getByTestId("json-tree-row:$")).toBeInTheDocument();
  });
});
