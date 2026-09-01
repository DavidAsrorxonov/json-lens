export type JsonPrimitive = string | number | boolean | null;

export type JsonObject = {
  [key: string]: JsonValue;
};

export type JsonArray = JsonValue[];

export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export type JsonContainer = JsonObject | JsonArray;

export function isJsonContainer(value: JsonValue): value is JsonContainer {
  return Array.isArray(value) || (typeof value === "object" && value !== null);
}
