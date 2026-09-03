import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
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

    expect(within(tokenRow).getByText('"abcd..."')).toBeInTheDocument();
    expect(
      within(tokenRow).getByText("6 more characters"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Copy value $.token",
      }),
    );

    expect(onCopyValue).toHaveBeenCalledWith(longValue, "$.token");
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
});
