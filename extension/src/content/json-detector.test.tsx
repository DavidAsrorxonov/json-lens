import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JsonDocumentViewer, RawJsonViewer } from "./json-detector";
import { parseResponseBody } from "../shared/lib";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
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

describe("JsonDocumentViewer", () => {
  it("shows parser warnings for direct JSON documents", () => {
    render(
      <JsonDocumentViewer
        url="https://api.example.com/value"
        contentType="application/json"
        rawText='"hello"'
        parseResult={parseResponseBody('"hello"')}
      />,
    );

    expect(
      screen.getByText("Top-level JSON value is a primitive."),
    ).toBeInTheDocument();
  });

  it("resets raw copy feedback after a short delay", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText,
      },
    });

    render(
      <JsonDocumentViewer
        url="https://api.example.com/users"
        contentType="application/json"
        rawText='{"ok":true}'
        parseResult={parseResponseBody('{"ok":true}')}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /copy raw/i }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith('{"ok":true}');

    act(() => {
      vi.advanceTimersByTime(1800);
    });

    expect(
      screen.getByRole("button", { name: /copy raw/i }),
    ).toBeInTheDocument();
  });
});
