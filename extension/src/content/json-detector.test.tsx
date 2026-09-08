import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RawJsonViewer } from "./json-detector";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("RawJsonViewer", () => {
  it("highlights raw search matches and marks the active match", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    render(
      <RawJsonViewer
        rawText='{"name":"Alpha","team":"alpha"}'
        searchQuery="alpha"
        activeMatchIndex={1}
      />,
    );

    const matches = screen.getAllByText(/alpha/i);

    expect(matches).toHaveLength(2);
    expect(matches[1]).toHaveClass("is-active");
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "center",
      inline: "center",
    });
  });

  it("renders raw text without highlights when there is no search query", () => {
    render(
      <RawJsonViewer
        rawText='{"name":"Alpha"}'
        searchQuery=""
        activeMatchIndex={-1}
      />,
    );

    expect(screen.getByText('{"name":"Alpha"}')).toBeInTheDocument();
    expect(document.querySelector("mark")).toBeNull();
  });
});
