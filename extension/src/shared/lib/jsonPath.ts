export type JsonPathSegment = string | number;

const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function formatJsonPath(segments: JsonPathSegment[]): string {
  if (segments.length === 0) {
    return "$";
  }

  return segments.reduce<string>((path, segment) => {
    if (typeof segment === "number") {
      return `${path}[${segment}]`;
    }

    if (IDENTIFIER_PATTERN.test(segment)) {
      return `${path}.${segment}`;
    }

    return `${path}[${JSON.stringify(segment)}]`;
  }, "$");
}
