import {
  isJsonMimeType,
  isPlainTextMimeType,
  looksLikeJsonText,
  parseResponseBody,
  type ParseResponseResult,
} from "../shared/lib";

export type JsonDocumentState = {
  url: string;
  contentType: string;
  rawText: string;
  parseResult: ParseResponseResult;
};

export type RawSearchMatch = {
  index: number;
  start: number;
  end: number;
};

export function shouldRenderJsonViewer(
  contentType: string,
  rawText: string,
): boolean {
  if (isJsonMimeType(contentType)) {
    return true;
  }

  return isPlainTextMimeType(contentType) && looksLikeJsonText(rawText);
}

export function getJsonDocumentState({
  url,
  contentType,
  rawText,
}: {
  url: string;
  contentType: string;
  rawText: string;
}): JsonDocumentState | null {
  if (!shouldRenderJsonViewer(contentType, rawText)) {
    return null;
  }

  return {
    url,
    contentType,
    rawText,
    parseResult: parseResponseBody(rawText),
  };
}

export function getRawSearchMatches(
  rawText: string,
  searchQuery: string,
): RawSearchMatch[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (normalizedQuery.length === 0) {
    return [];
  }

  const normalizedRawText = rawText.toLowerCase();
  const matches: RawSearchMatch[] = [];
  let searchIndex = 0;

  while (searchIndex < normalizedRawText.length) {
    const matchIndex = normalizedRawText.indexOf(normalizedQuery, searchIndex);

    if (matchIndex === -1) {
      break;
    }

    matches.push({
      index: matches.length,
      start: matchIndex,
      end: matchIndex + normalizedQuery.length,
    });
    searchIndex = matchIndex + normalizedQuery.length;
  }

  return matches;
}
