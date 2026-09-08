import { useEffect, useMemo, useRef, useState } from "react";
import {
  isJsonMimeType,
  looksLikeJsonText,
  parseResponseBody,
  type ParseResponseResult,
} from "../shared/lib";

export const MAX_CAPTURED_REQUESTS = 200;
export const MAX_CAPTURE_ERRORS = 20;

export type CapturedJsonRequest = {
  id: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  mimeType: string;
  startedDateTime: string;
  durationMs: number;
  byteLength: number;
  contentEncoding: string;
  parseResult: ParseResponseResult;
};

export type NetworkCaptureError = {
  id: string;
  url: string;
  method: string;
  message: string;
  capturedAt: string;
};

export type NetworkRequestsSnapshot = {
  requests: CapturedJsonRequest[];
  selectedRequestId: string | null;
  captureErrors: NetworkCaptureError[];
};

export type NetworkRequestsState = NetworkRequestsSnapshot & {
  selectedRequest: CapturedJsonRequest | null;
  isListening: boolean;
  clearCaptureErrors: () => void;
  clearRequests: () => void;
  selectRequest: (requestId: string) => void;
};

export function createInitialNetworkRequestsSnapshot(): NetworkRequestsSnapshot {
  return {
    requests: [],
    selectedRequestId: null,
    captureErrors: [],
  };
}

export function createRequestId(
  request: chrome.devtools.network.Request,
  sequenceNumber: number,
): string {
  return [
    sequenceNumber,
    request.startedDateTime,
    request.request.method,
    request.request.url,
  ].join(":");
}

export function shouldInspectBody({
  mimeType,
  content,
  encoding,
}: {
  mimeType: string;
  content: string;
  encoding: string;
}): boolean {
  if (encoding !== "") {
    return false;
  }

  return isJsonMimeType(mimeType) || looksLikeJsonText(content);
}

export function toCapturedJsonRequest({
  request,
  content,
  encoding,
  sequenceNumber,
}: {
  request: chrome.devtools.network.Request;
  content: string;
  encoding: string;
  sequenceNumber: number;
}): CapturedJsonRequest | null {
  const mimeType = request.response.content.mimeType ?? "";

  if (!shouldInspectBody({ mimeType, content, encoding })) {
    return null;
  }

  const parseResult = parseResponseBody(content);

  return {
    id: createRequestId(request, sequenceNumber),
    url: request.request.url,
    method: request.request.method,
    status: request.response.status,
    statusText: request.response.statusText,
    mimeType,
    startedDateTime: request.startedDateTime,
    durationMs: request.time,
    byteLength: parseResult.byteLength,
    contentEncoding: encoding,
    parseResult,
  };
}

export function appendCapturedRequest(
  snapshot: NetworkRequestsSnapshot,
  request: CapturedJsonRequest,
  maxRequests = MAX_CAPTURED_REQUESTS,
): NetworkRequestsSnapshot {
  const requests = [request, ...snapshot.requests].slice(0, maxRequests);
  const selectedRequestStillExists =
    snapshot.selectedRequestId !== null &&
    requests.some(
      (capturedRequest) => capturedRequest.id === snapshot.selectedRequestId,
    );
  const selectedRequestId = selectedRequestStillExists
    ? snapshot.selectedRequestId
    : snapshot.selectedRequestId === null
      ? request.id
      : requests[0]?.id ?? null;

  return {
    ...snapshot,
    requests,
    selectedRequestId,
  };
}

export function selectCapturedRequest(
  snapshot: NetworkRequestsSnapshot,
  requestId: string,
): NetworkRequestsSnapshot {
  if (
    !snapshot.requests.some(
      (capturedRequest) => capturedRequest.id === requestId,
    )
  ) {
    return snapshot;
  }

  return {
    ...snapshot,
    selectedRequestId: requestId,
  };
}

export function appendCaptureError(
  snapshot: NetworkRequestsSnapshot,
  error: NetworkCaptureError,
  maxErrors = MAX_CAPTURE_ERRORS,
): NetworkRequestsSnapshot {
  return {
    ...snapshot,
    captureErrors: [error, ...snapshot.captureErrors].slice(0, maxErrors),
  };
}

export function toNetworkCaptureError({
  request,
  error,
  sequenceNumber,
}: {
  request: chrome.devtools.network.Request;
  error: unknown;
  sequenceNumber: number;
}): NetworkCaptureError {
  return {
    id: createRequestId(request, sequenceNumber),
    url: request.request.url,
    method: request.request.method,
    message: error instanceof Error ? error.message : "Unable to read content.",
    capturedAt: new Date().toISOString(),
  };
}

function readRequestContent({
  request,
  onContent,
  onError,
}: {
  request: chrome.devtools.network.Request;
  onContent: (content: string, encoding: string) => void;
  onError: (error: unknown) => void;
}) {
  try {
    request.getContent((content, encoding) => {
      onContent(content, encoding);
    });
  } catch (error) {
    onError(error);
  }
}

export function useNetworkRequests(): NetworkRequestsState {
  const sequenceRef = useRef(0);
  const [snapshot, setSnapshot] = useState<NetworkRequestsSnapshot>(() =>
    createInitialNetworkRequestsSnapshot(),
  );

  useEffect(() => {
    function handleRequestFinished(request: chrome.devtools.network.Request) {
      sequenceRef.current += 1;
      const sequenceNumber = sequenceRef.current;

      readRequestContent({
        request,
        onContent: (content, encoding) => {
          const capturedRequest = toCapturedJsonRequest({
            request,
            content,
            encoding,
            sequenceNumber,
          });

          if (!capturedRequest) {
            return;
          }

          setSnapshot((currentSnapshot) =>
            appendCapturedRequest(currentSnapshot, capturedRequest),
          );
        },
        onError: (error) => {
          const captureError = toNetworkCaptureError({
            request,
            error,
            sequenceNumber,
          });

          setSnapshot((currentSnapshot) =>
            appendCaptureError(currentSnapshot, captureError),
          );
        },
      });
    }

    chrome.devtools.network.onRequestFinished.addListener(
      handleRequestFinished,
    );

    return () => {
      chrome.devtools.network.onRequestFinished.removeListener(
        handleRequestFinished,
      );
    };
  }, []);

  const selectedRequest = useMemo(
    () =>
      snapshot.requests.find(
        (request) => request.id === snapshot.selectedRequestId,
      ) ?? snapshot.requests[0] ?? null,
    [snapshot.requests, snapshot.selectedRequestId],
  );
  const selectedRequestId = selectedRequest?.id ?? null;

  function clearCaptureErrors() {
    setSnapshot((currentSnapshot) => ({
      ...currentSnapshot,
      captureErrors: [],
    }));
  }

  function clearRequests() {
    setSnapshot((currentSnapshot) => ({
      ...currentSnapshot,
      requests: [],
      selectedRequestId: null,
    }));
  }

  function selectRequest(requestId: string) {
    setSnapshot((currentSnapshot) =>
      selectCapturedRequest(currentSnapshot, requestId),
    );
  }

  return {
    ...snapshot,
    selectedRequestId,
    selectedRequest,
    isListening: true,
    clearCaptureErrors,
    clearRequests,
    selectRequest,
  };
}
