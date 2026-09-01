import { z } from "zod";
import { PAYLOAD_LIMITS } from "./payloadLimits";
import type { JsonValue } from "./jsonTypes";

export type ParseResponseResult =
  | {
      ok: true;
      data: JsonValue;
      byteLength: number;
      warnings: ParseResponseWarning[];
    }
  | {
      ok: false;
      error: ParseResponseError;
      byteLength: number;
      warnings: ParseResponseWarning[];
    };

export type ParseResponseWarning =
  | {
      type: "large-payload";
      message: string;
      byteLength: number;
      warnAtBytes: number;
    }
  | {
      type: "top-level-primitive";
      message: string;
    };

export type ParseResponseError =
  | {
      type: "empty-body";
      message: string;
    }
  | {
      type: "payload-too-large";
      message: string;
      byteLength: number;
      maxAutoParseBytes: number;
    }
  | {
      type: "invalid-json";
      message: string;
    }
  | {
      type: "unsupported-json-value";
      message: string;
    };

const jsonSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(z.string(), jsonSchema),
  ]),
);

export function parseResponseBody(text: string): ParseResponseResult {
  const byteLength = new TextEncoder().encode(text).byteLength;
  const warnings: ParseResponseWarning[] = [];

  if (text.trim().length === 0) {
    return {
      ok: false,
      byteLength,
      warnings,
      error: {
        type: "empty-body",
        message: "Response body is empty.",
      },
    };
  }

  if (byteLength > PAYLOAD_LIMITS.maxAutoParseBytes) {
    return {
      ok: false,
      byteLength,
      warnings,
      error: {
        type: "payload-too-large",
        message: "Payload is too large to parse automatically.",
        byteLength,
        maxAutoParseBytes: PAYLOAD_LIMITS.maxAutoParseBytes,
      },
    };
  }

  if (byteLength > PAYLOAD_LIMITS.warnParseBytes) {
    warnings.push({
      type: "large-payload",
      message:
        "Payload is large; rendering should stay shallow and virtualized.",
      byteLength,
      warnAtBytes: PAYLOAD_LIMITS.warnParseBytes,
    });
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      byteLength,
      warnings,
      error: {
        type: "invalid-json",
        message: "Response body is not valid JSON.",
      },
    };
  }

  const validated = jsonSchema.safeParse(parsed);

  if (!validated.success) {
    return {
      ok: false,
      byteLength,
      warnings,
      error: {
        type: "unsupported-json-value",
        message: "Parsed value is not supported by the JSON viewer.",
      },
    };
  }

  if (
    validated.data === null ||
    ["string", "number", "boolean"].includes(typeof validated.data)
  ) {
    warnings.push({
      type: "top-level-primitive",
      message: "Top-level JSON value is a primitive.",
    });
  }

  return {
    ok: true,
    data: validated.data,
    byteLength,
    warnings,
  };
}
