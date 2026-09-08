export function normalizeActiveIndex(index: number, matchCount: number): number {
  if (matchCount === 0) {
    return -1;
  }

  return ((index % matchCount) + matchCount) % matchCount;
}

export function formatBytes(byteLength: number): string {
  if (byteLength < 1024) {
    return `${byteLength} B`;
  }

  if (byteLength < 1024 * 1024) {
    return `${(byteLength / 1024).toFixed(1)} KB`;
  }

  return `${(byteLength / (1024 * 1024)).toFixed(1)} MB`;
}
