export const PAYLOAD_LIMITS = {
  warnParseBytes: 2 * 1024 * 1024,
  maxAutoParseBytes: 10 * 1024 * 1024,
  maxInitialRenderedNodes: 5_000,
  maxAutoExpandedNodes: 1_000,
  maxDepth: 200,
  previewStringLength: 20_000,
} as const;

export type PayloadLimitName = keyof typeof PAYLOAD_LIMITS;
