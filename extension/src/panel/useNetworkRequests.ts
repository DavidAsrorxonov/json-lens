import { useEffect, useMemo, useState } from "react";
import {
  isJsonMimeType,
  looksLikeJsonText,
  parseResponseBody,
  type ParseResponseResult,
} from "../shared/lib";

const MAX_CAPTURED_REQUESTS = 200;

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

export type NetworkRequestsState = {
  requests: CapturedJsonRequest[];
  selectedRequestId: string | null;
  selectedRequest: CapturedJsonRequest | null;
  isListening: boolean;
  clearRequests: () => void;
  selectRequest: (requestId: string) => void;
};

function createRequestId(request: chrome.devtools.network.Request): string {
  return `${request.startedDateTime}:${request.request.method}:${request.request.url}`;
}

function shouldInspectBody(
  mimeType: string,
  content: string,
  encoding: string,
): boolean {
  if (encoding !== "") {
    return false;
  }

  return isJsonMimeType(mimeType) || looksLikeJsonText(content);
}

function toCapturedJsonRequest(
  request: chrome.devtools.network.Request,
  content: string,
  encoding: string,
): CapturedJsonRequest | null {
  const mimeType = request.response.content.mimeType ?? "";

  if (!shouldInspectBody(mimeType, content, encoding)) {
    return null;
  }

  const parseResult = parseResponseBody(content);

  return {
    id: createRequestId(request),
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

export function useNetworkRequests(): NetworkRequestsState {
  const [requests, setRequests] = useState<CapturedJsonRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    function handleRequestFinished(request: chrome.devtools.network.Request) {
      request.getContent((content, encoding) => {
        const capturedRequest = toCapturedJsonRequest(
          request,
          content,
          encoding,
        );

        if (!capturedRequest) {
          return;
        }

        setRequests((currentRequests) => {
          const withoutDuplicate = currentRequests.filter(
            (existingRequest) => existingRequest.id !== capturedRequest.id,
          );
          const nextRequests = [capturedRequest, ...withoutDuplicate].slice(
            0,
            MAX_CAPTURED_REQUESTS,
          );

          setSelectedRequestId((currentSelectedId) => {
            if (currentSelectedId !== null) {
              return currentSelectedId;
            }

            return capturedRequest.id;
          });

          return nextRequests;
        });
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
    () => requests.find((request) => request.id === selectedRequestId) ?? null,
    [requests, selectedRequestId],
  );

  function clearRequests() {
    setRequests([]);
    setSelectedRequestId(null);
  }

  function selectRequest(requestId: string) {
    setSelectedRequestId(requestId);
  }

  return {
    requests,
    selectedRequestId,
    selectedRequest,
    isListening: true,
    clearRequests,
    selectRequest,
  };
}
