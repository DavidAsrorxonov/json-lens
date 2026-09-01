const JSON_MIME_EXACT = new Set(["application/json", "text/json"]);

export function normalizeMimeType(mimeType: string): string {
  return mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function isJsonMimeType(mimeType: string): boolean {
  const normalized = normalizeMimeType(mimeType);

  if (JSON_MIME_EXACT.has(normalized)) {
    return true;
  }

  return normalized.endsWith("+json");
}

export function isPlainTextMimeType(mimeType: string): boolean {
  return normalizeMimeType(mimeType) === "text/plain";
}
