import { describe, expect, it } from "vitest";
import {
  appendCapturedRequest,
  appendCaptureError,
  createInitialNetworkRequestsSnapshot,
  createRequestId,
  selectCapturedRequest,
  shouldInspectBody,
  toCapturedJsonRequest,
  toNetworkCaptureError,
  type CapturedJsonRequest,
} from "./useNetworkRequests";

function createDevToolsRequest({
  url = "https://api.example.com/users",
  method = "GET",
  status = 200,
  statusText = "OK",
  mimeType = "application/json",
  startedDateTime = "2026-09-08T07:00:00.000Z",
  durationMs = 42,
}: {
  url?: string;
  method?: string;
  status?: number;
  statusText?: string;
  mimeType?: string;
  startedDateTime?: string;
  durationMs?: number;
} = {}): chrome.devtools.network.Request {
  return {
    startedDateTime,
    time: durationMs,
    request: {
      method,
      url,
    },
    response: {
      status,
      statusText,
      content: {
        mimeType,
      },
    },
    getContent: () => undefined,
  } as unknown as chrome.devtools.network.Request;
}

function captureRequest({
  sequenceNumber,
  content = '{"ok":true}',
  mimeType = "application/json",
  encoding = "",
  url,
}: {
  sequenceNumber: number;
  content?: string;
  mimeType?: string;
  encoding?: string;
  url?: string;
}): CapturedJsonRequest {
  const capturedRequest = toCapturedJsonRequest({
    request: createDevToolsRequest({ mimeType, url }),
    content,
    encoding,
    sequenceNumber,
  });

  if (!capturedRequest) {
    throw new Error("Expected request to be captured.");
  }

  return capturedRequest;
}

describe("network request capture model", () => {
  it("captures valid JSON MIME responses", () => {
    const capturedRequest = captureRequest({
      sequenceNumber: 1,
      content: '{"users":[{"id":1}]}',
      mimeType: "application/json; charset=utf-8",
    });

    expect(capturedRequest.mimeType).toBe("application/json; charset=utf-8");
    expect(capturedRequest.parseResult.ok).toBe(true);

    if (capturedRequest.parseResult.ok) {
      expect(capturedRequest.parseResult.data).toEqual({
        users: [{ id: 1 }],
      });
    }
  });

  it("captures mislabeled JSON text responses", () => {
    const capturedRequest = captureRequest({
      sequenceNumber: 2,
      content: '[{"id":1}]',
      mimeType: "text/plain",
    });

    expect(capturedRequest.parseResult.ok).toBe(true);
  });

  it("ignores non-JSON responses", () => {
    const capturedRequest = toCapturedJsonRequest({
      request: createDevToolsRequest({ mimeType: "text/html" }),
      content: "<!doctype html><html></html>",
      encoding: "",
      sequenceNumber: 3,
    });

    expect(capturedRequest).toBeNull();
  });

  it("keeps invalid JSON responses with parse errors", () => {
    const capturedRequest = captureRequest({
      sequenceNumber: 4,
      content: "{ bad json",
      mimeType: "application/json",
    });

    expect(capturedRequest.parseResult.ok).toBe(false);

    if (!capturedRequest.parseResult.ok) {
      expect(capturedRequest.parseResult.error.type).toBe("invalid-json");
    }
  });

  it("skips encoded response bodies", () => {
    expect(
      shouldInspectBody({
        mimeType: "application/json",
        content: "eyJvayI6dHJ1ZX0=",
        encoding: "base64",
      }),
    ).toBe(false);
  });

  it("uses the sequence number to avoid request ID collisions", () => {
    const request = createDevToolsRequest();

    expect(createRequestId(request, 1)).not.toBe(createRequestId(request, 2));
  });

  it("caps captured requests, keeps newest requests first, and preserves selection while possible", () => {
    let snapshot = createInitialNetworkRequestsSnapshot();
    const first = captureRequest({
      sequenceNumber: 1,
      url: "https://api.example.com/1",
    });
    const second = captureRequest({
      sequenceNumber: 2,
      url: "https://api.example.com/2",
    });
    const third = captureRequest({
      sequenceNumber: 3,
      url: "https://api.example.com/3",
    });
    const fourth = captureRequest({
      sequenceNumber: 4,
      url: "https://api.example.com/4",
    });

    snapshot = appendCapturedRequest(snapshot, first, 3);
    snapshot = appendCapturedRequest(snapshot, second, 3);
    snapshot = appendCapturedRequest(snapshot, third, 3);

    expect(snapshot.requests.map((request) => request.id)).toEqual([
      third.id,
      second.id,
      first.id,
    ]);
    expect(snapshot.selectedRequestId).toBe(first.id);

    snapshot = appendCapturedRequest(snapshot, fourth, 3);

    expect(snapshot.requests.map((request) => request.id)).toEqual([
      fourth.id,
      third.id,
      second.id,
    ]);
    expect(snapshot.selectedRequestId).toBe(fourth.id);
  });

  it("selects known requests and ignores unknown request IDs", () => {
    let snapshot = createInitialNetworkRequestsSnapshot();
    const first = captureRequest({ sequenceNumber: 1 });
    const second = captureRequest({ sequenceNumber: 2 });

    snapshot = appendCapturedRequest(snapshot, first);
    snapshot = appendCapturedRequest(snapshot, second);
    snapshot = selectCapturedRequest(snapshot, second.id);

    expect(snapshot.selectedRequestId).toBe(second.id);

    snapshot = selectCapturedRequest(snapshot, "missing");

    expect(snapshot.selectedRequestId).toBe(second.id);
  });

  it("normalizes content read failures as capped capture errors", () => {
    let snapshot = createInitialNetworkRequestsSnapshot();
    const request = createDevToolsRequest({
      url: "https://api.example.com/failing",
    });
    const firstError = toNetworkCaptureError({
      request,
      error: new Error("Content is unavailable."),
      sequenceNumber: 1,
    });
    const secondError = toNetworkCaptureError({
      request,
      error: "unknown",
      sequenceNumber: 2,
    });

    snapshot = appendCaptureError(snapshot, firstError, 1);
    snapshot = appendCaptureError(snapshot, secondError, 1);

    expect(snapshot.captureErrors).toHaveLength(1);
    expect(snapshot.captureErrors[0]).toMatchObject({
      id: secondError.id,
      url: "https://api.example.com/failing",
      method: "GET",
      message: "Unable to read content.",
    });
    expect(firstError.message).toBe("Content is unavailable.");
  });
});
