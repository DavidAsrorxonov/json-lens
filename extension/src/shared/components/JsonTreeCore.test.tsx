import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
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

    expect(screen.getByText('"response"')).toBeInTheDocument();
    expect(screen.getAllByText("Object").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1 key").length).toBeGreaterThan(0);
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

    const collapseButtons = screen.getAllByRole("button", {
      name: "Collapse node",
    });

    await user.click(collapseButtons[0]);

    expect(screen.queryByText('"data"')).not.toBeInTheDocument();

    const expandButtons = screen.getAllByRole("button", {
      name: "Expand node",
    });

    await user.click(expandButtons[0]);

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
});
